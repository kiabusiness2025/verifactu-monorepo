import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { connectSector, isSectorProvider } from '@/app/lib/sector-connector';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const { provider } = await params;
  if (!isSectorProvider(provider)) {
    return NextResponse.json({ error: 'Proveedor no soportado.' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { apiKey?: string };
  const apiKey = body.apiKey?.trim();
  if (!apiKey || apiKey.length < 4) {
    return NextResponse.json({ error: 'API key inválida.' }, { status: 422 });
  }

  // TODO: when API docs are available, validate key with a test call before saving.
  // e.g. for Revo: GET https://revoxef.works/api/external/v1/whoami

  try {
    await connectSector(session.tenantId, session.userId, provider, apiKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[sector/${provider}/connect]`, err);
    return NextResponse.json({ error: 'Error al guardar la conexión.' }, { status: 500 });
  }
}
