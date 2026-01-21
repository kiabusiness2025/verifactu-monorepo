import { createAuditLog } from '@/lib/audit';
import { setImpersonationCookie } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';

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
    const { targetCompanyId } = body;

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'targetCompanyId es requerido' }, { status: 400 });
    }

    // Fetch company with owner info
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const targetUserId = company.ownerUserId;

    // Set impersonation cookie
    await setImpersonationCookie({
      targetUserId,
      targetCompanyId,
      startedAt: new Date().toISOString(),
    });

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'IMPERSONATION_START',
      targetUserId,
      targetCompanyId,
      metadata: {
        targetUserEmail: company.owner.email,
        companyName: company.name,
        startedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Impersonación iniciada',
      targetUserId,
      targetCompanyId,
      targetUserEmail: company.owner.email,
      companyName: company.name,
    });
  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json({ error: 'Error al iniciar impersonación' }, { status: 500 });
  }
}
