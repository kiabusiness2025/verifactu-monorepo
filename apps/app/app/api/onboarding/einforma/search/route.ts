import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { query as sqlQuery } from '@/lib/db';
import { searchCompanies } from '@/server/einforma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeQuery(value: string) {
  return value.trim().toUpperCase();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractCachedItems(normalized: unknown, raw: unknown): unknown[] {
  if (Array.isArray(normalized)) return normalized;
  const normalizedItems = asRecord(normalized).items;
  if (Array.isArray(normalizedItems)) return normalizedItems;
  const rawItems = asRecord(raw).items;
  if (Array.isArray(rawItems)) return rawItems;
  return Array.isArray(raw) ? raw : [];
}

function toSearchResult(item: unknown) {
  const row = asRecord(item);
  const id =
    (typeof row.id === 'string' ? row.id.trim() : '') ||
    (typeof row.nif === 'string' ? row.nif.trim().toUpperCase() : '');
  return {
    einformaId: id,
    name: typeof row.name === 'string' ? row.name : '',
    nif: typeof row.nif === 'string' ? row.nif : '',
    province: typeof row.province === 'string' ? row.province : '',
    city: typeof row.city === 'string' ? row.city : '',
  };
}

async function searchFromLocalTable(query: string, limit: number) {
  const q = query.trim();
  if (!q) return [];

  const rows = await sqlQuery<{
    source_id: string | null;
    tax_id: string | null;
    legal_name: string | null;
    trade_name: string | null;
    city: string | null;
    province: string | null;
    tenant_name: string | null;
  }>(
    `SELECT
      tp.source_id,
      tp.tax_id,
      tp.legal_name,
      tp.trade_name,
      tp.city,
      tp.province,
      t.name AS tenant_name
     FROM tenant_profiles tp
     JOIN tenants t ON t.id = tp.tenant_id
     WHERE
       COALESCE(tp.legal_name, '') ILIKE $1 OR
       COALESCE(tp.trade_name, '') ILIKE $1 OR
       COALESCE(tp.tax_id, '') ILIKE $1 OR
       COALESCE(t.name, '') ILIKE $1 OR
       COALESCE(t.legal_name, '') ILIKE $1 OR
       COALESCE(t.nif, '') ILIKE $1
     ORDER BY tp.updated_at DESC
     LIMIT $2`,
    [`%${q}%`, Math.max(1, Math.min(limit, 25))]
  );

  const deduped = new Map<string, { einformaId: string; name: string; nif: string; province: string; city: string }>();
  for (const row of rows) {
    const nif = row.tax_id?.trim().toUpperCase() || '';
    const einformaId = (row.source_id?.trim() || nif || '').toUpperCase();
    const name = row.trade_name?.trim() || row.legal_name?.trim() || row.tenant_name?.trim() || '';
    if (!einformaId || !name) continue;
    const key = `${einformaId}|${name.toLowerCase()}`;
    if (deduped.has(key)) continue;
    deduped.set(key, {
      einformaId,
      name,
      nif,
      province: row.province?.trim() || '',
      city: row.city?.trim() || '',
    });
  }

  return Array.from(deduped.values());
}

export async function GET(req: Request) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const limiter = rateLimit(req, {
    limit: 30,
    windowMs: 60_000,
    keyPrefix: 'einforma-onboarding-search',
  });
  if (!limiter.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Number(searchParams.get('limit') ?? 10);

  if (q.length < 3) {
    return NextResponse.json({ ok: false, error: 'query too short' }, { status: 400 });
  }

  try {
    const localResults = await searchFromLocalTable(q, limit);
    if (localResults.length > 0) {
      return NextResponse.json(
        {
          ok: true,
          results: localResults,
          cached: true,
          cacheSource: 'tenantProfile',
          lastSyncAt: null,
        },
        { headers: { 'X-Einforma-Source': 'local-db' } }
      );
    }

    const normalizedQuery = normalizeQuery(q);
    const lookup = await prisma.einformaLookup.findUnique({
      where: { queryType_queryValue: { queryType: 'NAME', queryValue: normalizedQuery } },
      select: { normalized: true, raw: true, expiresAt: true, updatedAt: true },
    });

    if (lookup && lookup.expiresAt > new Date()) {
      const cachedItems = extractCachedItems(lookup.normalized, lookup.raw);
      const results = cachedItems
        .slice(0, Math.max(1, Math.min(limit, 25)))
        .map(toSearchResult)
        .filter((item) => item.einformaId && item.name);

      return NextResponse.json(
        {
          ok: true,
          results,
          cached: true,
          cacheSource: 'einformaLookup',
          lastSyncAt: lookup.updatedAt?.toISOString() ?? null,
        },
        { headers: { 'X-Einforma-Source': 'cache' } }
      );
    }

    const items = await searchCompanies(q);
    const rawJson = JSON.parse(JSON.stringify(items));
    await prisma.einformaLookup.upsert({
      where: { queryType_queryValue: { queryType: 'NAME', queryValue: normalizedQuery } },
      create: {
        queryType: 'NAME',
        queryValue: normalizedQuery,
        raw: rawJson,
        normalized: rawJson,
        expiresAt: addDays(7),
      },
      update: {
        raw: rawJson,
        normalized: rawJson,
        expiresAt: addDays(7),
      },
    });

    const results = items
      .slice(0, Math.max(1, Math.min(limit, 25)))
      .map((item) => ({
        einformaId: (item.id?.trim() || item.nif?.trim().toUpperCase() || ''),
        name: item.name,
        nif: item.nif ?? '',
        province: item.province ?? '',
        city: item.city ?? '',
      }))
      .filter((item) => item.einformaId && item.name);

    return NextResponse.json(
      { ok: true, results, cached: false, cacheSource: 'einforma', lastSyncAt: null },
      { headers: { 'X-Einforma-Source': 'live' } }
    );
  } catch (error) {
    console.error('eInforma search error:', error);
    return NextResponse.json(
      {
        ok: true,
        results: [],
        cached: false,
        cacheSource: 'unavailable',
        lastSyncAt: null,
        error: 'Servicio temporalmente no disponible. Puedes continuar manualmente o usar NIF.',
      },
      { status: 200 }
    );
  }
}
