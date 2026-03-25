'use server';

import { revalidatePath } from 'next/cache';
import { disconnectHoldedConnection } from '@/app/lib/holded-integration';
import { requireHoldedAdminSession } from '@/app/lib/holded-admin';
import { prisma } from '@/app/lib/prisma';

export async function toggleUserBlockAction(formData: FormData) {
  await requireHoldedAdminSession();

  const userId = String(formData.get('userId') || '').trim();
  const nextBlocked = String(formData.get('nextBlocked') || '').trim() === 'true';

  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: nextBlocked
      ? {
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: 'Bloqueado desde panel admin de Holded',
        }
      : {
          isBlocked: false,
          blockedAt: null,
          blockedReason: null,
        },
  });

  revalidatePath('/admin');
}

export async function disconnectTenantAction(formData: FormData) {
  const session = await requireHoldedAdminSession();
  const tenantId = String(formData.get('tenantId') || '').trim();

  if (!tenantId) return;

  await disconnectHoldedConnection({
    tenantId,
    userId: session.userId,
  });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
}
