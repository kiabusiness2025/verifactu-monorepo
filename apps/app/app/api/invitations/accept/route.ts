import { prisma } from '@/lib/prisma';
import { normalizeRole } from '@/lib/roles';
import { getSessionPayload } from '@/lib/session';
import { verifySessionTokenFromEnv } from '@verifactu/utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const invitationPayloadSchema = z.object({
  inviteTenantId: z.string().min(1),
  inviteEmail: z.string().email(),
  inviteRole: z.string().optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get('token') ?? '').trim();
  if (!token) {
    return NextResponse.redirect(new URL('/dashboard?invite=missing-token', url.origin));
  }

  const session = await getSessionPayload();
  if (!session?.uid) {
    const nextPath = `/api/invitations/accept?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(nextPath)}`, url.origin)
    );
  }

  const payloadUnknown = await verifySessionTokenFromEnv(token);
  if (!payloadUnknown) {
    return NextResponse.redirect(new URL('/dashboard?invite=invalid-token', url.origin));
  }

  const parsedPayload = invitationPayloadSchema.safeParse(payloadUnknown);
  if (!parsedPayload.success) {
    return NextResponse.redirect(new URL('/dashboard?invite=invalid-token', url.origin));
  }

  const inviteTenantId = parsedPayload.data.inviteTenantId.trim();
  const inviteEmail = parsedPayload.data.inviteEmail.trim().toLowerCase();
  const inviteRole = normalizeRole(parsedPayload.data.inviteRole) ?? 'member';

  if (!inviteTenantId || !inviteEmail) {
    return NextResponse.redirect(new URL('/dashboard?invite=invalid-token', url.origin));
  }

  const userEmail = String(session.email ?? '')
    .trim()
    .toLowerCase();
  if (!userEmail || userEmail !== inviteEmail) {
    return NextResponse.redirect(new URL('/dashboard?invite=email-mismatch', url.origin));
  }

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: inviteTenantId,
        userId: session.uid,
      },
    },
    create: {
      tenantId: inviteTenantId,
      userId: session.uid,
      role: inviteRole,
      status: 'active',
    },
    update: {
      role: inviteRole,
      status: 'active',
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: session.uid },
    create: {
      userId: session.uid,
      preferredTenantId: inviteTenantId,
    },
    update: {
      preferredTenantId: inviteTenantId,
    },
  });

  return NextResponse.redirect(new URL('/dashboard?invite=accepted', url.origin));
}
