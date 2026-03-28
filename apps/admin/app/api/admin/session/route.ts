import { requireAdmin } from '@/lib/adminAuth';
import { getAdminSessionOrNull } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const session = await getAdminSessionOrNull();

    if (!session) {
      return NextResponse.json({ ok: false, error: 'No hay una sesión activa' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        expires: null,
        user: {
          id: session.user?.id ?? null,
          email: session.user?.email ?? null,
          name: session.user?.name ?? null,
          role: session.user?.role ?? null,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: 'No se pudo cargar la sesión' }, { status: 500 });
  }
}
