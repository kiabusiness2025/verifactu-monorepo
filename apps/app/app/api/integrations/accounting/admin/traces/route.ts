import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listHoldedConnectorAdminTrace } from '@/lib/integrations/holdedConnectorTraceService';

export const runtime = 'nodejs';

function parseLimit(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), 100);
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN: Admin access required' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const traces = await listHoldedConnectorAdminTrace({
      sessionLimit: parseLimit(url.searchParams.get('sessionLimit'), 25),
      conversationLimit: parseLimit(url.searchParams.get('conversationLimit'), 25),
    });

    return NextResponse.json(traces);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las trazas del conector Holded',
      },
      { status: 500 }
    );
  }
}
