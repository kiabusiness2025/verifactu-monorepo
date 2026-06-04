// V1.9.3 — Generador de cartas masivas para asesores.
//
// POST /api/isaak/advisor/letters/batch
//   body JSON: {
//     template: string,            // texto con placeholders {{campo}}
//     rows: Array<Record<string,string>>,
//     subject?: string,
//     senderName?: string,
//     senderNif?: string,
//     filenameField?: string,      // columna para nombrar cada .docx
//   }
//
// Devuelve un binario application/zip con N .docx, uno por fila.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildLettersZip } from '@/app/lib/isaak-letter-batch';
import { logAdvisorEvent } from '@/app/lib/isaak-advisor-audit';

export const runtime = 'nodejs';

const MAX_ROWS = 200;
const MAX_TEMPLATE_LENGTH = 20_000;

type Body = {
  template?: unknown;
  rows?: unknown;
  subject?: unknown;
  senderName?: unknown;
  senderNif?: unknown;
  filenameField?: unknown;
};

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object') return false;
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (typeof v !== 'string') return false;
  }
  return true;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const template = typeof body.template === 'string' ? body.template : '';
  if (!template.trim()) {
    return NextResponse.json({ error: 'template_required' }, { status: 400 });
  }
  if (template.length > MAX_TEMPLATE_LENGTH) {
    return NextResponse.json({ error: 'template_too_long' }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'rows_required' }, { status: 400 });
  }
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: 'too_many_rows', max: MAX_ROWS },
      { status: 400 },
    );
  }
  if (!body.rows.every(isStringRecord)) {
    return NextResponse.json({ error: 'invalid_rows' }, { status: 400 });
  }

  const zip = await buildLettersZip({
    template,
    rows: body.rows as Record<string, string>[],
    subject: optionalString(body.subject),
    senderName: optionalString(body.senderName),
    senderNif: optionalString(body.senderNif),
    filenameField: optionalString(body.filenameField),
  });

  void logAdvisorEvent(session.tenantId, 'letters_generated', {
    count: body.rows.length,
    subject: optionalString(body.subject) ?? null,
  });

  const ts = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="cartas_${ts}.zip"`,
      'cache-control': 'no-store',
    },
  });
}
