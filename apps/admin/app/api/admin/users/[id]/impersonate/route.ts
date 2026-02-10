import { requireAdmin } from '@/lib/adminAuth';
import { setImpersonationCookie } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    await requireAdmin(req);

    await setImpersonationCookie({
      targetUserId: userId,
      targetCompanyId: '',
      startedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: 'Failed to impersonate user' }, { status: 500 });
  }
}