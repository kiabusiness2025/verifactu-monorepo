import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdminSession();
  const body = await req.json();
  const { reason } = body;

  if (!reason) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.isBlocked) {
    return NextResponse.json({ error: 'User already blocked' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason
      }
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: session.userId!,
        action: 'USER_BLOCK',
        targetUserId: params.id,
        metadata: { reason }
      }
    })
  ]);

  return NextResponse.json({ success: true });
}
