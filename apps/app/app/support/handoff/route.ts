import { NextResponse } from 'next/server';
import { SUPPORT_SESSION_COOKIE, verifySupportToken } from '@/src/server/support/supportToken';
import { prisma } from '@verifactu/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const payload = await verifySupportToken(token);
    const supportSession = await prisma.supportSession.findUnique({
      where: { id: payload.supportSessionId },
      select: { id: true, tenantId: true, endedAt: true },
    });

    if (!supportSession || supportSession.endedAt) {
      return NextResponse.json({ error: 'Support session not active' }, { status: 401 });
    }

    const response = NextResponse.redirect(
      new URL(`/dashboard?tenantId=${supportSession.tenantId}`, request.url)
    );
    response.cookies.set(SUPPORT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 20,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
