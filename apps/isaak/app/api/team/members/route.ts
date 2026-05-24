/**
 * GET  /api/team/members — list members in the caller's workspace
 * POST /api/team/members — invite a new member by email
 *
 * Auth: Firebase session (getHoldedSession).
 * Plan limits: free/starter=1, pyme=3, empresa=5, business=10, enterprise=unlimited.
 * Only admin or owner roles can invite members.
 */

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { sendTeamInviteEmail } from '@/app/lib/communications/team-invite-email';

export const runtime = 'nodejs';

// ── Seat limits per plan code ─────────────────────────────────────────────────

function maxSeatsForPlan(planCode: string): number {
  switch (planCode) {
    case 'enterprise':
      return -1; // unlimited
    case 'business':
      return 10;
    case 'empresa':
      return 5;
    case 'pyme':
      return 3;
    default:
      // free, starter
      return 1;
  }
}

// ── Role label ────────────────────────────────────────────────────────────────

function canManageTeam(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'company_admin';
}

// ── GET: list members ─────────────────────────────────────────────────────────

export async function GET() {
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const members = await prisma.membership.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ['active', 'invited'] },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: session.tenantId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  const planCode = subscription?.plan?.code ?? 'free';
  const maxSeats = maxSeatsForPlan(planCode);
  const activeCount = members.filter((m) => m.status === 'active').length;

  // Find caller's role
  const callerMembership = members.find((m) => m.userId === session.userId);
  const callerRole = callerMembership?.role ?? 'member';

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      confirmedAt: m.confirmedAt?.toISOString() ?? null,
      isCurrentUser: m.userId === session.userId,
    })),
    planCode,
    maxSeats,
    activeCount,
    canManage: canManageTeam(callerRole),
  });
}

// ── POST: invite a member ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check caller is admin/owner
  const callerMembership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: { tenantId: session.tenantId, userId: session.userId },
    },
    select: { role: true },
  });

  if (!callerMembership || !canManageTeam(callerMembership.role)) {
    return NextResponse.json(
      { error: 'Necesitas ser administrador para invitar miembros.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
  const role = typeof body.role === 'string' ? body.role : 'member';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Rol no válido.' }, { status: 400 });
  }

  // Check seat limit
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: session.tenantId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  const planCode = subscription?.plan?.code ?? 'free';
  const maxSeats = maxSeatsForPlan(planCode);

  if (maxSeats !== -1) {
    const activeCount = await prisma.membership.count({
      where: { tenantId: session.tenantId, status: { in: ['active', 'invited'] } },
    });
    if (activeCount >= maxSeats) {
      return NextResponse.json(
        {
          error: `Tu plan (${planCode}) permite un máximo de ${maxSeats} usuarios. Actualiza para añadir más.`,
          limitReached: true,
          maxSeats,
        },
        { status: 403 }
      );
    }
  }

  // Find or create user by email
  let inviteeUser = await prisma.user.findFirst({ where: { email } });
  if (!inviteeUser) {
    inviteeUser = await prisma.user.create({
      data: { email, authProvider: 'FIREBASE' },
    });
  }

  // Check if already a member
  const existing = await prisma.membership.findUnique({
    where: {
      tenantId_userId: { tenantId: session.tenantId, userId: inviteeUser.id },
    },
  });
  if (existing?.status === 'active') {
    return NextResponse.json(
      { error: 'Este usuario ya es miembro del espacio de trabajo.' },
      { status: 409 }
    );
  }

  // Generate invite token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const membership = await prisma.membership.upsert({
    where: {
      tenantId_userId: { tenantId: session.tenantId, userId: inviteeUser.id },
    },
    update: {
      role,
      status: 'invited',
      invitedBy: session.userId,
      confirmedAt: null,
      metadataJson: { inviteToken: token, inviteTokenExpiresAt: tokenExpiresAt },
    },
    create: {
      tenantId: session.tenantId,
      userId: inviteeUser.id,
      role,
      status: 'invited',
      invitedBy: session.userId,
      metadataJson: { inviteToken: token, inviteTokenExpiresAt: tokenExpiresAt },
    },
  });

  // Send invite email (best effort)
  const callerUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });
  const tenantProfile = await prisma.tenantProfile.findUnique({
    where: { tenantId: session.tenantId },
    select: { tradeName: true, legalName: true },
  });
  const companyName = tenantProfile?.tradeName ?? tenantProfile?.legalName ?? null;

  await sendTeamInviteEmail({
    inviteeEmail: email,
    inviterName: callerUser?.name ?? session.name ?? null,
    companyName,
    inviteToken: token,
    role,
  }).catch((err) =>
    console.error('[team/invite] email send failed', { email, err })
  );

  return NextResponse.json({
    ok: true,
    membershipId: membership.id,
    email,
    role,
    status: 'invited',
  });
}
