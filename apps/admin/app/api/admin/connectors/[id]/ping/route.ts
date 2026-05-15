/**
 * POST /api/admin/connectors/[id]/ping
 *
 * Verifica que la API key almacenada sigue siendo válida haciendo una
 * llamada ligera a Holded (/api/accounting/v1.1/accounts).
 */

import { requireAdmin } from '@/lib/adminAuth';
import { one } from '@/lib/db';
import { decryptHoldedSecret } from '@verifactu/integrations';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOLDED_PING_URL = 'https://api.holded.com/api/accounting/v1.1/accounts?limit=1';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    const row = await one<{ api_key_enc: string | null; connection_status: string }>(
      `SELECT api_key_enc, connection_status FROM external_connections WHERE id = $1 AND provider = 'holded'`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
    }
    if (!row.api_key_enc) {
      return NextResponse.json(
        { ok: false, reason: 'Sin API key almacenada (fue revocada o nunca registrada)' },
        { status: 200 }
      );
    }

    let apiKey: string;
    try {
      apiKey = decryptHoldedSecret(row.api_key_enc);
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'No se pudo descifrar la API key' },
        { status: 200 }
      );
    }

    const t0 = Date.now();
    let pingOk = false;
    let pingError: string | null = null;
    let statusCode = 0;

    try {
      const res = await fetch(HOLDED_PING_URL, {
        method: 'GET',
        headers: { key: apiKey },
        signal: AbortSignal.timeout(8000),
      });
      statusCode = res.status;
      pingOk = res.ok;
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        pingError = `HTTP ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`;
      }
    } catch (fetchErr) {
      pingError = fetchErr instanceof Error ? fetchErr.message : 'Timeout o error de red';
    }

    return NextResponse.json({
      ok: pingOk,
      latencyMs: Date.now() - t0,
      statusCode,
      reason: pingError,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors/:id/ping] failed', error);
    return NextResponse.json({ error: 'Error en el test de ping' }, { status: 500 });
  }
}
