import { createAuditLog } from '@/lib/audit';
import { createImpersonationToken, getImpersonationCookieHeader } from '@/lib/cookies';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, targetCompanyId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId es requerido' }, { status: 400 });
    }

    // Create signed impersonation token
    const token = await createImpersonationToken({
      adminUserId: user.id,
      targetUserId,
      targetCompanyId,
    });

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'IMPERSONATION_START',
      targetUserId,
      targetCompanyId,
      metadata: {
        startedAt: new Date().toISOString(),
      },
    });

    // Set cookie and return response
    const response = NextResponse.json({
      success: true,
      message: 'Impersonación iniciada',
      targetUserId,
      targetCompanyId,
    });

    response.headers.set('Set-Cookie', getImpersonationCookieHeader(token));

    return response;
  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json({ error: 'Error al iniciar impersonación' }, { status: 500 });
  }
}
