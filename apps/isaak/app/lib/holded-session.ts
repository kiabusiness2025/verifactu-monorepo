import { cookies } from 'next/headers';
import {
  getSharedSessionPayloadFromCookieStore,
  resolveSharedTenantSession,
} from '@verifactu/auth';
import { prisma } from './prisma';

export async function getHoldedSession() {
  const cookieStore = await cookies();
  const session = await resolveSharedTenantSession({
    cookieStore,
    findUserByAuthSubject: (authSubject) =>
      prisma.user.findFirst({
        where: { authSubject },
        select: { id: true, email: true, name: true, isBlocked: true },
      }),
  });

  if (session?.userId) {
    return session;
  }

  const payload = await getSharedSessionPayloadFromCookieStore(cookieStore);
  if (!payload?.uid || !payload?.tenantId || typeof payload.email !== 'string' || !payload.email) {
    return session;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ authSubject: payload.uid }, { email: payload.email }],
    },
    select: { id: true, email: true, name: true, isBlocked: true },
  });

  if (existingUser?.isBlocked) {
    return null;
  }

  const normalizedName =
    (typeof payload.name === 'string' && payload.name.trim()) ||
    existingUser?.name ||
    payload.email.split('@')[0] ||
    null;

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: payload.email,
          name: normalizedName,
          authProvider: 'FIREBASE',
          authSubject: payload.uid,
        },
        select: { id: true, email: true, name: true, isBlocked: true },
      })
    : await prisma.user.create({
        data: {
          email: payload.email,
          name: normalizedName,
          authProvider: 'FIREBASE',
          authSubject: payload.uid,
        },
        select: { id: true, email: true, name: true, isBlocked: true },
      });

  try {
    await prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: payload.tenantId,
          userId: user.id,
        },
      },
      update: {
        status: 'active',
      },
      create: {
        tenantId: payload.tenantId,
        userId: user.id,
        role: 'owner',
        status: 'active',
      },
    });

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: { preferredTenantId: payload.tenantId },
      create: {
        userId: user.id,
        preferredTenantId: payload.tenantId,
      },
    });
  } catch {
    // best effort alignment for cross-domain handoff into Isaak
  }

  return {
    payload,
    tenantId: payload.tenantId,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}
