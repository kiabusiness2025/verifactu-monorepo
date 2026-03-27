import { cookies } from 'next/headers';
import { resolveSharedTenantSession } from '@verifactu/auth';
import { prisma } from './prisma';

export async function getHoldedSession() {
  const cookieStore = await cookies();
  return resolveSharedTenantSession({
    cookieStore,
    findUserByAuthSubject: (authSubject) =>
      prisma.user.findFirst({
        where: { authSubject },
        select: { id: true, email: true, name: true, isBlocked: true },
      }),
  });
}
