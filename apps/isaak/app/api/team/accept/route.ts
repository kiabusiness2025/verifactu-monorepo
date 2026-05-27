/**
 * GET /api/team/accept?token=<inviteToken>
 *
 * Accepts a team invitation. The user must already be authenticated
 * (session cookie present). If not, redirects to auth with return URL.
 *
 * Flow (post SEC C4 hardening 2026):
 * 1. Validate token from query param
 * 2. If user not authenticated → redirect to auth
 * 3. Hash the incoming token (SHA-256) and look up the membership by
 *    hash via Prisma JSON path query (no full table scan)
 * 4. Check token not expired (TTL 48h)
 * 5. REQUIRE invited user's email is non-null AND matches the caller's
 *    email exactly (case-insensitive) — esto bloquea el caso del stub
 *    user sin email que permitía reclamar membership ajena
 * 6. Activate membership IN A SINGLE UPDATE (clear token + status active
 *    + confirmedAt) — single-use atómico, sin ventana de race
 * 7. Set preferredTenantId → redirect to /chat
 */

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { buildIsaakAuthUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

export const runtime = 'nodejs';

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Token de invitación inválido.' }, { status: 400 });
  }

  // Require authentication
  const session = await getHoldedSession();
  if (!session?.userId || !session.tenantId) {
    const acceptUrl = `${ISAAK_PUBLIC_URL}/api/team/accept?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(buildIsaakAuthUrl('team_invite_accept', acceptUrl));
  }

  // SEC C4: lookup por hash, no full scan. Aceptamos también lookup
  // por token raw (legacy) durante una ventana de migración corta. Si
  // el comportamiento está en prod >48h, todas las invitaciones legacy
  // ya habrán expirado.
  const tokenHash = hashInviteToken(token);
  const matchByHash = await prisma.membership.findFirst({
    where: {
      status: 'invited',
      metadataJson: { path: ['inviteTokenHash'], equals: tokenHash },
    },
    include: {
      user: { select: { id: true, email: true, authSubject: true } },
    },
  });
  const matchByLegacy = matchByHash
    ? null
    : await prisma.membership.findFirst({
        where: {
          status: 'invited',
          metadataJson: { path: ['inviteToken'], equals: token },
        },
        include: {
          user: { select: { id: true, email: true, authSubject: true } },
        },
      });
  const match = matchByHash ?? matchByLegacy;

  if (!match) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=not_found`,
    );
  }

  // Check token expiry
  const meta = match.metadataJson as Record<string, unknown> | null;
  const expiresAt = meta?.inviteTokenExpiresAt;
  if (expiresAt && new Date(expiresAt as string) < new Date()) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=expired`,
    );
  }

  // SEC C4 (2026): exigir que el email del usuario invitado sea
  // NO-NULO y coincida con el del caller. Anteriormente, si el stub
  // user no tenía email, la guarda se saltaba y permitía reclamar la
  // membership desde otro user.
  const callerUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!callerUser?.email || !match.user.email) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=email_missing`,
    );
  }
  if (callerUser.email.toLowerCase() !== match.user.email.toLowerCase()) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=email_mismatch`,
    );
  }

  // If caller is a different user record than invited user, transfer the
  // membership (e.g. the invited email was pre-created as a stub user,
  // but the real Firebase user has a different user.id).
  const membershipUserId = match.userId;
  const realUserId = session.userId;

  if (membershipUserId !== realUserId) {
    const existing = await prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId: match.tenantId, userId: realUserId } },
    });

    if (!existing) {
      // SEC C4: activar Y limpiar el token en la MISMA update (atómico,
      // single-use). Antes se hacía en dos updates separados (race
      // window de unos ms entre transferir owner y limpiar token).
      await prisma.membership.update({
        where: { id: match.id },
        data: {
          userId: realUserId,
          status: 'active',
          confirmedAt: new Date(),
          metadataJson: Prisma.DbNull,
        },
      });
    } else if (existing.status !== 'active') {
      // Activate existing + delete stub atomically
      await prisma.$transaction([
        prisma.membership.update({
          where: { id: existing.id },
          data: {
            role: match.role,
            status: 'active',
            confirmedAt: new Date(),
            metadataJson: Prisma.DbNull,
            invitedBy: match.invitedBy,
          },
        }),
        prisma.membership.delete({ where: { id: match.id } }),
      ]);
    }
  } else {
    // Caller is the same user record as the invited user → activate +
    // clear token atómicamente.
    await prisma.membership.update({
      where: { id: match.id },
      data: {
        status: 'active',
        confirmedAt: new Date(),
        metadataJson: Prisma.DbNull,
      },
    });
  }

  // Set preferred tenant
  await prisma.userPreference.upsert({
    where: { userId: realUserId },
    update: { preferredTenantId: match.tenantId },
    create: { userId: realUserId, preferredTenantId: match.tenantId },
  });

  return NextResponse.redirect(`${ISAAK_PUBLIC_URL}/chat?teamInviteAccepted=1`);
}
