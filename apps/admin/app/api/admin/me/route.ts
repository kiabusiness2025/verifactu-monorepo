import { IMPERSONATION_COOKIE_NAME, verifyImpersonationToken } from '@/lib/cookies';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;

    // Check impersonation status
    const cookieStore = cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
    let impersonation = null;

    if (impersonationCookie) {
      const payload = await verifyImpersonationToken(impersonationCookie.value);
      if (payload) {
        impersonation = {
          active: true,
          targetUserId: payload.targetUserId,
          targetCompanyId: payload.targetCompanyId,
          startedAt: new Date(payload.startedAt).toISOString(),
          expiresAt: payload.expiresAt
            ? new Date(payload.expiresAt).toISOString()
            : undefined,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      impersonation: impersonation || { active: false },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Error al obtener sesión' }, { status: 500 });
  }
}
