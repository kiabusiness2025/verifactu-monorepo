import { requireAdminContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ alertId: string }> };

/**
 * PATCH /api/admin/isaak/alerts/[alertId]
 *
 * Body: { action: 'mark_sent' | 'dismiss' }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminContext(request);

    const { alertId } = await params;
    const body = (await request.json()) as { action: string };

    if (!alertId) {
      return NextResponse.json({ ok: false, error: 'alertId requerido' }, { status: 400 });
    }

    const alert = await prisma.isaakAlert.findUnique({ where: { id: alertId } });
    if (!alert) {
      return NextResponse.json({ ok: false, error: 'Alerta no encontrada' }, { status: 404 });
    }

    if (body.action === 'mark_sent') {
      const updated = await prisma.isaakAlert.update({
        where: { id: alertId },
        data: { status: 'sent', sentAt: new Date() },
      });
      return NextResponse.json({ ok: true, alert: updated });
    }

    if (body.action === 'dismiss') {
      const updated = await prisma.isaakAlert.update({
        where: { id: alertId },
        data: { status: 'dismissed' },
      });
      return NextResponse.json({ ok: true, alert: updated });
    }

    return NextResponse.json({ ok: false, error: 'Acción no reconocida' }, { status: 400 });
  } catch (err) {
    console.error('[PATCH /api/admin/isaak/alerts]', err);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
