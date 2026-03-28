import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSharedSessionPayloadFromCookieStore } from '@verifactu/auth';
import { authOptions } from './auth-options';
import prisma from './prisma';

export type AdminSession = {
  userId: string | null;
  role?: string | null;
  email?: string | null;
};

type SessionLike = {
  user?: {
    id?: string | null;
    role?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
};

function isLocalBypassEnabled() {
  return process.env.ADMIN_LOCAL_BYPASS === '1' && process.env.NODE_ENV !== 'production';
}

function readAdminAllowlist() {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmail = (
    process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business'
  ).toLowerCase();
  const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business').toLowerCase();

  return { adminEmails, allowedEmail, allowedDomain };
}

function isAllowedAdminEmail(email: string) {
  const normalized = email.toLowerCase();
  const { adminEmails, allowedEmail, allowedDomain } = readAdminAllowlist();

  return (
    adminEmails.includes(normalized) ||
    normalized === allowedEmail ||
    (allowedDomain && normalized.endsWith(`@${allowedDomain}`))
  );
}

export async function getAdminSessionOrNull(): Promise<SessionLike | null> {
  const session = (await getServerSession(authOptions)) as SessionLike | null;
  if (session?.user) return session;

  const cookieStore = await cookies();
  const sharedPayload = await getSharedSessionPayloadFromCookieStore(cookieStore).catch(() => null);
  const sharedEmail = typeof sharedPayload?.email === 'string' ? sharedPayload.email : null;

  if (sharedPayload?.uid && sharedEmail && isAllowedAdminEmail(sharedEmail)) {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ authSubject: sharedPayload.uid }, { email: sharedEmail }],
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return {
      user: {
        id: dbUser?.id ?? sharedPayload.uid,
        role: dbUser?.role ?? 'ADMIN',
        email: dbUser?.email ?? sharedEmail,
        name: dbUser?.name ?? (typeof sharedPayload.name === 'string' ? sharedPayload.name : null),
      },
    };
  }

  if (isLocalBypassEnabled()) {
    return {
      user: {
        id: 'local-admin',
        role: 'ADMIN',
        email: 'local@verifactu.business',
        name: 'Admin Local',
      },
    };
  }

  return null;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSessionOrNull();
  if (!session?.user) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role ?? null;
  if (role && role !== 'ADMIN') {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    userId: (session.user as any).id ?? null,
    role,
    email: session.user.email ?? null,
  };
}
