import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
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

      return NextResponse.json({
        ok: true,
        results,
        cached: true,
        cacheSource: 'einformaLookup',
        lastSyncAt: lookup.updatedAt?.toISOString() ?? null,
      });
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

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('eInforma search error:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo completar la búsqueda' },
      { status: 502 }
    );
  }
}
