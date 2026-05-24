// F6: long-term memory facts endpoint.
//
// POST /api/isaak/memory/facts
//   { fact, factType, source?, confidence?, expiresAt? }
//   → { id }
//
// GET /api/isaak/memory/facts?q=...&topK=5&minSimilarity=0.6&factType=preference
//   → { facts: [{ id, fact, factType, similarity, createdAt }] }
//
// DELETE /api/isaak/memory/facts?id=<uuid>
//   → { deleted: 0|1 }
//
// Strict tenant isolation: tenant_id is taken from the session, never from
// the request body. Cross-tenant access is impossible by construction.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  deleteMemoryFact,
  retrieveRelevantFacts,
  storeMemoryFact,
  type FactSource,
  type FactType,
} from '@/app/lib/isaak-long-term-memory';

const FACT_TYPES: ReadonlySet<FactType> = new Set([
  'preference',
  'history',
  'decision',
  'profile',
  'other',
]);
const FACT_SOURCES: ReadonlySet<FactSource> = new Set([
  'user',
  'tool_result',
  'feedback',
  'admin',
]);

const MAX_FACT_LENGTH = 2000;
const MAX_QUERY_LENGTH = 500;

async function requireSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const input = body as {
    fact?: unknown;
    factType?: unknown;
    source?: unknown;
    confidence?: unknown;
    expiresAt?: unknown;
    conversationId?: unknown;
  };

  const fact = typeof input.fact === 'string' ? input.fact.trim() : '';
  if (!fact || fact.length > MAX_FACT_LENGTH) {
    return NextResponse.json({ error: 'fact_invalid_or_too_long' }, { status: 400 });
  }

  const factType =
    typeof input.factType === 'string' && FACT_TYPES.has(input.factType as FactType)
      ? (input.factType as FactType)
      : null;
  if (!factType) {
    return NextResponse.json({ error: 'factType_invalid' }, { status: 400 });
  }

  const source =
    typeof input.source === 'string' && FACT_SOURCES.has(input.source as FactSource)
      ? (input.source as FactSource)
      : 'admin';

  let expiresAt: Date | null = null;
  if (typeof input.expiresAt === 'string' && input.expiresAt.trim()) {
    const parsed = new Date(input.expiresAt);
    if (!Number.isFinite(parsed.getTime())) {
      return NextResponse.json({ error: 'expiresAt_invalid' }, { status: 400 });
    }
    expiresAt = parsed;
  }

  const confidence =
    typeof input.confidence === 'number' &&
    Number.isFinite(input.confidence) &&
    input.confidence >= 0 &&
    input.confidence <= 1
      ? input.confidence
      : 1.0;

  try {
    const result = await storeMemoryFact({
      tenantId: session.tenantId,
      userId: session.userId ?? null,
      conversationId: typeof input.conversationId === 'string' ? input.conversationId : null,
      fact,
      factType,
      source,
      confidence,
      expiresAt,
    });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (err) {
    console.error('[memory/facts POST]', err);
    return NextResponse.json({ error: 'embedding_or_store_failed' }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q || q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'q_required_or_too_long' }, { status: 400 });
  }

  const topKParam = parseInt(url.searchParams.get('topK') ?? '', 10);
  const topK = Number.isFinite(topKParam) && topKParam > 0 ? topKParam : undefined;

  const minSimParam = parseFloat(url.searchParams.get('minSimilarity') ?? '');
  const minSimilarity =
    Number.isFinite(minSimParam) && minSimParam >= 0 && minSimParam <= 1
      ? minSimParam
      : undefined;

  const factTypeParam = url.searchParams.get('factType');
  const factTypes =
    factTypeParam && FACT_TYPES.has(factTypeParam as FactType)
      ? [factTypeParam as FactType]
      : undefined;

  try {
    const facts = await retrieveRelevantFacts({
      tenantId: session.tenantId,
      queryText: q,
      topK,
      minSimilarity,
      factTypes,
    });
    return NextResponse.json({ facts });
  } catch (err) {
    console.error('[memory/facts GET]', err);
    return NextResponse.json({ error: 'retrieve_failed' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const url = new URL(req.url);
  const factId = (url.searchParams.get('id') ?? '').trim();
  if (!factId) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  try {
    const result = await deleteMemoryFact({
      tenantId: session.tenantId,
      factId,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[memory/facts DELETE]', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 502 });
  }
}
