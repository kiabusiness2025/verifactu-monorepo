import { NextResponse } from 'next/server';
import { setImpersonationCookie } from '@/lib/cookies';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);

    await setImpersonationCookie({
      targetUserId: params.id,
      targetCompanyId: '',
      startedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: 'Failed to impersonate user' }, { status: 500 });
  }
}