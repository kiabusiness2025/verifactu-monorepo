/**
 * GET  /api/admin/tenants/[id]/memberships — lista miembros + invitaciones pendientes
 * POST /api/admin/tenants/[id]/memberships — invitar usuario a un tenant
 *
 * Admin bypasses seat limits. Owners can never be downgraded (protected in PATCH).
 */

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const ISAAK_URL = process.env.NEXT_PUBLIC_ISAAK_URL ?? 'https://isaak.verifactu.business';

// ── GET: list members ─────────────────────────────────────────────────────────

export async function GET(req: Request, { params }: RouteContext) {
  await requireAdmin(req);
  const { id: tenantId } = await params;

  const [members, tenant] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId, status: { in: ['active', 'invited', 'disabled'] } },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    }),
  ]);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Resolve inviter names for pending invites
  const inviterIds = [...new Set(members.map((m) => m.invitedBy).filter(Boolean) as string[])];
  const inviters =
    inviterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const inviterMap = Object.fromEntries(inviters.map((u) => [u.id, u]));

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      status: m.status,
      side: m.side,
      createdAt: m.createdAt.toISOString(),
      confirmedAt: m.confirmedAt?.toISOString() ?? null,
      disabledAt: m.disabledAt?.toISOString() ?? null,
      invitedBy: m.invitedBy ? (inviterMap[m.invitedBy] ?? null) : null,
      // Expose token expiry for pending invites (not the token itself)
      inviteExpiresAt:
        m.status === 'invited' &&
        m.metadataJson &&
        typeof m.metadataJson === 'object' &&
        'inviteTokenExpiresAt' in (m.metadataJson as Record<string, unknown>)
          ? (m.metadataJson as Record<string, string>).inviteTokenExpiresAt
          : null,
    })),
  });
}

// ── POST: invite member ───────────────────────────────────────────────────────

export async function POST(req: Request, { params }: RouteContext) {
  const admin = await requireAdmin(req);
  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
  const role = typeof body.role === 'string' ? body.role : 'member';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }
  if (!['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Rol no válido.' }, { status: 400 });
  }

  // Find or create invitee user
  let invitee = await prisma.user.findFirst({ where: { email } });
  if (!invitee) {
    invitee = await prisma.user.create({ data: { email, authProvider: 'FIREBASE' } });
  }

  // Check if already active
  const existing = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId: invitee.id } },
  });
  if (existing?.status === 'active') {
    return NextResponse.json(
      { error: 'Este usuario ya es miembro activo del espacio de trabajo.' },
      { status: 409 }
    );
  }

  const token = randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();

  // Find admin user record (for invitedBy)
  const adminUser = admin.userId
    ? await prisma.user.findFirst({ where: { id: admin.userId }, select: { id: true } })
    : null;

  const membership = await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId, userId: invitee.id } },
    update: {
      role,
      status: 'invited',
      invitedBy: adminUser?.id ?? null,
      confirmedAt: null,
      disabledAt: null,
      metadataJson: { inviteToken: token, inviteTokenExpiresAt: tokenExpiresAt },
    },
    create: {
      tenantId,
      userId: invitee.id,
      role,
      status: 'invited',
      invitedBy: adminUser?.id ?? null,
      metadataJson: { inviteToken: token, inviteTokenExpiresAt: tokenExpiresAt },
    },
  });

  // Send invite email (best effort)
  const tenantProfile = await prisma.tenantProfile.findUnique({
    where: { tenantId },
    select: { tradeName: true, legalName: true },
  });
  const companyName = tenantProfile?.tradeName ?? tenantProfile?.legalName ?? null;

  await sendAdminInviteEmail({
    inviteeEmail: email,
    inviterName: admin.email,
    companyName,
    inviteToken: token,
    role,
  }).catch((err) => console.error('[admin/memberships] invite email failed', err));

  return NextResponse.json({ ok: true, membershipId: membership.id, email, role });
}

// ── Email helper ──────────────────────────────────────────────────────────────

async function sendAdminInviteEmail(opts: {
  inviteeEmail: string;
  inviterName: string;
  companyName: string | null;
  inviteToken: string;
  role: string;
}) {
  const resendKey = process.env.RESEND_API_KEY?.replace(/[\r\n]/g, '').trim();
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const from =
    process.env.RESEND_FROM_ISAAK?.replace(/[\r\n]/g, '').trim() ||
    process.env.RESEND_FROM?.replace(/[\r\n]/g, '').trim() ||
    'Isaak <no-reply@verifactu.business>';

  const acceptUrl = `${ISAAK_URL}/api/team/accept?token=${opts.inviteToken}`;
  const company = opts.companyName
    ? `<strong>${opts.companyName}</strong>`
    : 'un espacio de trabajo';
  const roleLabel = opts.role === 'admin' ? 'administrador' : 'miembro';

  await resend.emails.send({
    from,
    to: opts.inviteeEmail,
    subject: `Invitación al equipo de ${opts.companyName ?? 'Isaak'}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Te han invitado a unirte al equipo</h2>
        <p style="color:#475569;margin:0 0 24px;">
          ${opts.inviterName} te ha invitado como <strong>${roleLabel}</strong> en ${company} en Isaak.
        </p>
        <a href="${acceptUrl}"
           style="display:inline-block;background:#2361d8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Aceptar invitación
        </a>
        <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">
          Este enlace caduca en 7 días.
          Si no esperabas esta invitación, ignora este mensaje.
        </p>
      </div>`,
  });
}
