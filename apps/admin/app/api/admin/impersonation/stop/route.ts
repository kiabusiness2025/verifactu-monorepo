import { createAuditLog } from '@/lib/audit';
import {
  getClearImpersonationCookieHeader,
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonationToken,
} from '@/lib/cookies';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;

    // Get current impersonation token
    const cookieStore = cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);

    let targetUserId = null;
    let targetCompanyId = null;

    if (impersonationCookie) {
      const payload = await verifyImpersonationToken(impersonationCookie.value);
      if (payload) {
        targetUserId = payload.targetUserId;
        targetCompanyId = payload.targetCompanyId;
      }
    }

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'IMPERSONATION_STOP',
      targetUserId: targetUserId || undefined,
      targetCompanyId: targetCompanyId || undefined,
      metadata: {
        stoppedAt: new Date().toISOString(),
      },
    });

    // Clear cookie and return response
    const response = NextResponse.json({
      success: true,
      message: 'Impersonación detenida',
    });

    response.headers.set('Set-Cookie', getClearImpersonationCookieHeader());

    return response;
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    return NextResponse.json({ error: 'Error al detener impersonación' }, { status: 500 });
  }
}
