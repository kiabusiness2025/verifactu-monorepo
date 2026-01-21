import { NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requireAdminSession();

  const email = await prisma.emailEvent.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      user: true
    }
  });

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  return NextResponse.json(email);
}
