// V2.0.3 — Importador masivo de clientes del asesor desde CSV.
//
// POST /api/isaak/advisor/clients/import
//   body: { csv: string }
//
// Columnas reconocidas (case-insensitive, separadas por coma):
//   - alias (obligatorio)
//   - companyName / company_name / razon_social
//   - nif
//   - holdedApiKey / holded_api_key
//   - notes / notas
//   - modelos (lista separada por '|', ej "303|111|115")
//
// Devuelve { created, skipped, errors }.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { encryptHoldedSecret, maskSecret } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import { parseCsv } from '@/app/lib/isaak-csv';
import {
  ADVISOR_SELECTABLE_MODELOS,
  setClientFiscalProfile,
} from '@/app/lib/isaak-advisor-fiscal';
import { logAdvisorEvent } from '@/app/lib/isaak-advisor-audit';

export const runtime = 'nodejs';

const MAX_ROWS = 500;

type Row = Record<string, string>;

const ALIAS_COLS = ['alias', 'nombre', 'name'];
const COMPANY_COLS = ['companyname', 'company_name', 'razon_social', 'razonsocial', 'empresa'];
const NIF_COLS = ['nif', 'cif', 'dni'];
const HOLDED_COLS = ['holdedapikey', 'holded_api_key', 'apikey', 'holded'];
const NOTES_COLS = ['notes', 'notas', 'observaciones'];
const MODELOS_COLS = ['modelos', 'aeat'];

function pick(row: Row, candidates: string[]): string {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) lower[k.toLowerCase().trim()] = v;
  for (const c of candidates) {
    if (lower[c]) return lower[c];
  }
  return '';
}

function parseModelos(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter((s): s is string =>
      (ADVISOR_SELECTABLE_MODELOS as readonly string[]).includes(s),
    );
}

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { csv?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.csv !== 'string' || !body.csv.trim()) {
    return NextResponse.json({ error: 'csv_required' }, { status: 400 });
  }

  const parsed = parseCsv(body.csv);
  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: 'no_rows' }, { status: 400 });
  }
  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: 'too_many_rows', max: MAX_ROWS },
      { status: 400 },
    );
  }

  const created: Array<{ id: string; alias: string }> = [];
  const skipped: Array<{ rowIndex: number; reason: string }> = [];

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const row = parsed.rows[i];
    const alias = pick(row, ALIAS_COLS).trim();
    if (!alias) {
      skipped.push({ rowIndex: i + 2, reason: 'sin_alias' });
      continue;
    }

    const holdedRaw = pick(row, HOLDED_COLS).trim();
    const notes = pick(row, NOTES_COLS).trim() || null;
    const modelos = parseModelos(pick(row, MODELOS_COLS));

    try {
      const client = await prisma.advisorClient.create({
        data: {
          advisorTenantId: session.tenantId,
          alias,
          companyName: pick(row, COMPANY_COLS).trim() || null,
          nif: pick(row, NIF_COLS).trim() || null,
          notes,
          holdedApiKeyEnc: holdedRaw ? encryptHoldedSecret(holdedRaw) : null,
          holdedKeyMasked: holdedRaw ? maskSecret(holdedRaw) : null,
        },
        select: { id: true, alias: true },
      });
      created.push(client);
      if (modelos.length > 0) {
        await setClientFiscalProfile(session.tenantId, client.id, modelos);
      }
    } catch (err) {
      skipped.push({
        rowIndex: i + 2,
        reason: err instanceof Error ? err.message.slice(0, 120) : 'db_error',
      });
    }
  }

  if (created.length > 0) {
    void logAdvisorEvent(session.tenantId, 'clients_imported', {
      created: created.length,
      skipped: skipped.length,
    });
  }

  return NextResponse.json({
    created: created.length,
    skipped,
    clients: created,
  });
}
