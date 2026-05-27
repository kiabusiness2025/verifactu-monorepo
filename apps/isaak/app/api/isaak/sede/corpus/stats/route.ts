// R2/R3 — Stats del corpus AEAT (admin only).
//
// GET /api/isaak/sede/corpus/stats
//   → { sources: [{ id, type, name, url, chunkCount, lastIngestedAt, status }], totals }
//
// Permite al admin ver qué fuentes están ingestadas, cuántos chunks
// tiene cada una y cuándo se actualizaron por última vez.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { AEAT_SOURCES } from '@/app/lib/aeat-corpus-sources';
import { getCorpusStats } from '@/app/lib/aeat-corpus-search';

export const runtime = 'nodejs';

function getAdminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS ?? process.env.HOLDED_ADMIN_EMAILS ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function isAdminSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user?.email) return null;
  const admins = getAdminEmails();
  if (admins.length === 0) return null;
  if (!admins.includes(user.email.toLowerCase())) return null;
  return { userId: session.userId, email: user.email };
}

export async function GET() {
  const admin = await isAdminSession();
  if (!admin) return NextResponse.json({ error: 'admin_required' }, { status: 403 });

  try {
    const stats = await getCorpusStats();
    const statsBySourceId = new Map(stats.map((s) => [s.sourceId, s]));

    // Combinar el registry con los stats de DB → vista completa con
    // status para cada source.
    const sources = AEAT_SOURCES.map((src) => {
      const stat = statsBySourceId.get(src.id);
      const status: 'ingested' | 'missing' = stat ? 'ingested' : 'missing';
      return {
        id: src.id,
        type: src.type,
        name: src.name,
        url: src.url,
        tags: src.tags,
        chunkCount: stat?.chunkCount ?? 0,
        lastIngestedAt: stat?.lastIngestedAt ?? null,
        status,
      };
    });

    const totalChunks = sources.reduce((s, x) => s + x.chunkCount, 0);
    const ingestedCount = sources.filter((s) => s.status === 'ingested').length;
    const missingCount = sources.length - ingestedCount;

    return NextResponse.json({
      ok: true,
      sources,
      totals: {
        sources: sources.length,
        ingested: ingestedCount,
        missing: missingCount,
        chunks: totalChunks,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'stats_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
