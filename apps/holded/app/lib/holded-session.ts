import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { readSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from './session';

export async function getHoldedSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token, readSessionSecret());
  if (!payload?.uid || !payload.tenantId) return null;

  const user = await prisma.user.findFirst({
    where: { authSubject: payload.uid },
    select: { id: true, email: true, name: true, isBlocked: true },
  });

  if (user?.isBlocked) return null;

  return {
    payload,
    tenantId: payload.tenantId,
    userId: user?.id ?? null,
    email: user?.email ?? (typeof payload.email === 'string' ? payload.email : null),
    name: user?.name ?? (typeof payload.name === 'string' ? payload.name : null),
  };
}
