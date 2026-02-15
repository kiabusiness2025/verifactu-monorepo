import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { readSessionSecret, signSessionToken } from '@verifactu/utils';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORT_ADMIN_EMAIL = 'support@verifactu.business';
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
let inviteSecret: string | null = null;
try {
  inviteSecret = readSessionSecret();
} catch {
  inviteSecret = null;
}

type CollaboratorInput = {
  email?: string;
  role?: string;
};

function normalizeRole(value?: string) {
  const role = (value ?? '').toLowerCase();
  if (role === 'owner' || role === 'admin' || role === 'member' || role === 'asesor') {
    return role;
  }
  return 'member';
}

function buildInviteEmailHtml(params: {
  inviterName: string;
  companyName: string;
  acceptLink: string;
  role: string;
}) {
  const { inviterName, companyName, acceptLink, role } = params;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">Invitación de colaboración</h2>
      <p>
        <strong>${inviterName}</strong> te ha invitado a colaborar en <strong>${companyName}</strong>
        con rol <strong>${role}</strong>.
      </p>
      <p style="margin: 20px 0;">
        <a href="${acceptLink}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">
          Aceptar invitación
        </a>
      </p>
      <p>Si el botón no funciona, copia este enlace:</p>
      <p><a href="${acceptLink}">${acceptLink}</a></p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
      <p style="font-size:12px;color:#475569;">
        Este mensaje ha sido enviado desde Verifactu Business.
      </p>
    </div>
  `;
}

function splitCnae(value?: string) {
  if (!value) return { code: null, text: null };
  const parts = value
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { code: null, text: null };
  if (parts.length === 1) return { code: parts[0], text: null };
  return { code: parts[0], text: parts.slice(1).join(' - ') };
}

function normalizeCity(value?: string) {
  if (!value) return { postalCode: null, city: null };
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{5})\s+([^()]+)(?:\s*\(.*\))?$/);
  if (match) {
    return { postalCode: match[1], city: match[2].trim() };
  }
  return { postalCode: null, city: trimmed.split('(')[0]?.trim() || trimmed };
}

// POST - Crear empresa
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const {
      name,
      legal_name,
      tax_id,
      email,
      phone,
      address,
      city,
      postal_code,
      country,
      cnae,
      incorporation_date,
      legal_form,
      status,
      website,
      capital_social,
      province,
      representative,
      source,
      source_id,
      collaborators,
    } = body;

    const cnaeParts = splitCnae(cnae);
    const cityParts = normalizeCity(city);
    const resolvedPostal = postal_code ?? cityParts.postalCode;
    const resolvedCity = city ?? cityParts.city;

    const [result] = await query<{ id: string }>(
      `INSERT INTO tenants (name, legal_name, tax_id, email, phone, address, city, postal_code, country, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [name, legal_name, tax_id, email, phone, address, resolvedCity, resolvedPostal, country]
    );

    const tenantId = result?.id;
    let invitedCount = 0;
    if (tenantId) {
      const shouldCreateProfile =
        cnae ||
        incorporation_date ||
        address ||
        city ||
        province ||
        legal_form ||
        status ||
        website ||
        capital_social ||
        representative ||
        source ||
        source_id;

      if (shouldCreateProfile) {
        const isEinforma = (source ?? 'manual') === 'einforma';
        await query(
          `INSERT INTO tenant_profiles (
             tenant_id,
             source,
             source_id,
             cnae,
             cnae_code,
             cnae_text,
             legal_form,
             status,
             website,
             capital_social,
             incorporation_date,
             address,
             postal_code,
             city,
             province,
             country,
             representative,
             einforma_last_sync_at,
             einforma_tax_id_verified,
             updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
           ON CONFLICT (tenant_id) DO UPDATE
           SET source = EXCLUDED.source,
               source_id = EXCLUDED.source_id,
               cnae = EXCLUDED.cnae,
               cnae_code = EXCLUDED.cnae_code,
               cnae_text = EXCLUDED.cnae_text,
               legal_form = EXCLUDED.legal_form,
               status = EXCLUDED.status,
               website = EXCLUDED.website,
               capital_social = EXCLUDED.capital_social,
               incorporation_date = EXCLUDED.incorporation_date,
               address = EXCLUDED.address,
               postal_code = EXCLUDED.postal_code,
               city = EXCLUDED.city,
               province = EXCLUDED.province,
               country = EXCLUDED.country,
               representative = EXCLUDED.representative,
               einforma_last_sync_at = EXCLUDED.einforma_last_sync_at,
               einforma_tax_id_verified = EXCLUDED.einforma_tax_id_verified,
               updated_at = NOW()`,
          [
            tenantId,
            source ?? 'manual',
            source_id ?? null,
            cnae ?? null,
            cnaeParts.code,
            cnaeParts.text,
            legal_form ?? null,
            status ?? null,
            website ?? null,
            capital_social ?? null,
            incorporation_date ? new Date(incorporation_date) : null,
            address ?? null,
            resolvedPostal,
            resolvedCity,
            province ?? null,
            country ?? null,
            representative ?? null,
            isEinforma ? new Date() : null,
            isEinforma ? true : null,
          ]
        );
      }

      const supportUser = await prisma.user.upsert({
        where: { email: SUPPORT_ADMIN_EMAIL },
        update: { role: 'ADMIN', name: 'Verifactu Support' },
        create: {
          email: SUPPORT_ADMIN_EMAIL,
          name: 'Verifactu Support',
          role: 'ADMIN',
        },
      });

      await query(
        `INSERT INTO memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET role = 'owner', status = 'active'`,
        [tenantId, supportUser.id]
      );

      if (admin?.userId) {
        await query(
          `INSERT INTO memberships (tenant_id, user_id, role, status)
           VALUES ($1, $2, 'owner', 'active')
           ON CONFLICT (tenant_id, user_id) DO UPDATE
           SET role = 'owner', status = 'active'`,
          [tenantId, admin.userId]
        );
      }

      const collaboratorRows = Array.isArray(collaborators) ? (collaborators as CollaboratorInput[]) : [];
      const uniqueByEmail = new Map<string, CollaboratorInput>();
      collaboratorRows.forEach((row) => {
        const email = (row?.email ?? '').trim().toLowerCase();
        if (!email) return;
        if (email === SUPPORT_ADMIN_EMAIL) return;
        uniqueByEmail.set(email, { email, role: row.role });
      });

      for (const collaborator of uniqueByEmail.values()) {
        const inviteEmail = (collaborator.email ?? '').trim().toLowerCase();
        if (!inviteEmail) continue;
        const role = normalizeRole(collaborator.role);
        const invitee = await prisma.user.findUnique({
          where: { email: inviteEmail },
          select: { id: true },
        });
        if (invitee?.id) {
          const existingMembership = await query<{ status: string | null }>(
            `SELECT status
             FROM memberships
             WHERE tenant_id = $1 AND user_id = $2
             LIMIT 1`,
            [tenantId, invitee.id]
          );
          if ((existingMembership[0]?.status ?? '').toLowerCase() !== 'active') {
            await query(
              `INSERT INTO memberships (tenant_id, user_id, role, status)
               VALUES ($1, $2, $3, 'invited')
               ON CONFLICT (tenant_id, user_id) DO UPDATE
               SET role = EXCLUDED.role, status = 'invited'`,
              [tenantId, invitee.id, role]
            );
          }
        }

        if (!resend || !inviteSecret) continue;

        const token = await signSessionToken({
          payload: {
            type: 'team-invite',
            inviteTenantId: tenantId,
            inviteEmail,
            inviteRole: role,
            inviteBy: admin.userId || null,
          } as any,
          secret: inviteSecret,
          expiresIn: '7d',
        });

        const acceptLink = `${APP_BASE_URL}/api/invitations/accept?token=${encodeURIComponent(token)}`;
        const inviterName = admin.email || 'Verifactu Business';
        const sendResult = await resend.emails.send({
          from: 'Verifactu Business <soporte@verifactu.business>',
          to: inviteEmail,
          subject: `👋 ${inviterName} te ha invitado a colaborar en ${name}`,
          html: buildInviteEmailHtml({
            inviterName,
            companyName: name,
            acceptLink,
            role,
          }),
        });

        if (!(sendResult as any)?.error) {
          invitedCount += 1;
        }
      }
    }

    return NextResponse.json({ ok: true, id: result?.id, invitedCount });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create company' }, { status: 500 });
  }
}
