import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { normalizeRole } from '@/lib/roles';
import { readSessionSecret, verifySessionToken } from '@verifactu/utils';

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
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}`, url.origin));
  }

  const secret = readSessionSecret();
  const payload = await verifySessionToken(token, secret);
  if (!payload) {
    return NextResponse.redirect(new URL('/dashboard?invite=invalid-token', url.origin));
  }

  const inviteTenantId = String((payload as any).inviteTenantId ?? '').trim();
  const inviteEmail = String((payload as any).inviteEmail ?? '')
    .trim()
    .toLowerCase();
  const inviteRole = normalizeRole((payload as any).inviteRole) ?? 'member';

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

