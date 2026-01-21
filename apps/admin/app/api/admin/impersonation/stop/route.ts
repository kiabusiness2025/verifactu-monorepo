import { createAuditLog } from '@/lib/audit';
import { clearImpersonationCookie, getImpersonation } from '@/lib/cookies';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;

    // Get current impersonation
    const impersonation = await getImpersonation();

    let targetUserId = null;
    let targetCompanyId = null;
    let duration: string | null = null;

    if (impersonation) {
      targetUserId = impersonation.targetUserId;
      targetCompanyId = impersonation.targetCompanyId;

      // Calculate duration
      const startedAt = new Date(impersonation.startedAt);
      const stoppedAt = new Date();
      const durationMs = stoppedAt.getTime() - startedAt.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      duration = `${durationMinutes} minutos`;
    }

    // Clear impersonation cookie
    clearImpersonationCookie();

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'IMPERSONATION_STOP',
      targetUserId: targetUserId || undefined,
      targetCompanyId: targetCompanyId || undefined,
      metadata: {
        stoppedAt: new Date().toISOString(),
        duration,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Impersonación detenida',
    });
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    return NextResponse.json({ error: 'Error al detener impersonación' }, { status: 500 });
  }
}
