/**
 * GET /api/team/accept?token=<inviteToken>
 *
 * Accepts a team invitation. The user must already be authenticated
 * (session cookie present). If not, redirects to auth with return URL.
 *
 * Flow:
 * 1. Validate token from query param
 * 2. If user not authenticated → redirect to auth
 * 3. Find pending Membership where metadataJson.inviteToken === token
 * 4. Check token not expired
 * 5. Verify the authenticated user's email matches the invited email
 * 6. Activate membership: status='active', confirmedAt=now, clear token
 * 7. Set preferredTenantId → redirect to /chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { buildIsaakAuthUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

export const runtime = 'nodejs';

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

  // Find membership with this invite token
  // We look for memberships where metadataJson contains the token
  const memberships = await prisma.membership.findMany({
    where: { status: 'invited' },
    include: {
      user: { select: { id: true, email: true, authSubject: true } },
    },
  });

  const match = memberships.find((m) => {
    const meta = m.metadataJson as Record<string, unknown> | null;
    return meta?.inviteToken === token;
  });

  if (!match) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=not_found`
    );
  }

  // Check token expiry
  const meta = match.metadataJson as Record<string, unknown> | null;
  const expiresAt = meta?.inviteTokenExpiresAt;
  if (expiresAt && new Date(expiresAt as string) < new Date()) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=expired`
    );
  }

  // Verify the current user's email matches the invited user's email
  // (or they ARE the same user if auth was set up correctly)
  const callerUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  if (
    callerUser?.email &&
    match.user.email &&
    callerUser.email.toLowerCase() !== match.user.email.toLowerCase()
  ) {
    return NextResponse.redirect(
      `${ISAAK_PUBLIC_URL}/settings?teamInviteError=email_mismatch`
    );
  }

  // If caller is a different user record than invited user, transfer the membership
  // (e.g. the invited email was pre-created as a stub user, but the real Firebase user has a different user.id)
  const membershipUserId = match.userId;
  const realUserId = session.userId;

  if (membershipUserId !== realUserId) {
    // Re-point membership to the real authenticated user
    // First delete the stub membership (if the real user already has a different membership, skip)
    const existing = await prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId: match.tenantId, userId: realUserId } },
    });

    if (!existing) {
      await prisma.membership.update({
        where: { id: match.id },
        data: { userId: realUserId },
      });
    } else if (existing.status !== 'active') {
      // Activate existing
      await prisma.membership.update({
        where: { id: existing.id },
        data: {
          role: match.role,
          status: 'active',
          confirmedAt: new Date(),
          metadataJson: Prisma.DbNull,
          invitedBy: match.invitedBy,
        },
      });
      // Remove stub
      await prisma.membership.delete({ where: { id: match.id } }).catch(() => {});
    }
  }

  // Activate membership
  // updateMany doesn't support Prisma.DbNull; clear token via separate update
  const activeMembership = await prisma.membership.findFirst({
    where: { tenantId: match.tenantId, userId: realUserId },
    select: { id: true },
  });
  if (activeMembership) {
    await prisma.membership.update({
      where: { id: activeMembership.id },
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
