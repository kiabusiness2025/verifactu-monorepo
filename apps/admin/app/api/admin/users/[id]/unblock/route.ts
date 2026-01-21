import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdminSession();

  const user = await prisma.user.findUnique({
    where: { id: params.id }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.isBlocked) {
    return NextResponse.json({ error: 'User not blocked' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null
      }
    }),
    prisma.auditLog.create({
      data: {
        adminUserId: session.userId!,
        action: 'USER_UNBLOCK',
        targetUserId: params.id,
        metadata: {}
      }
    })
  ]);

  return NextResponse.json({ success: true });
}
