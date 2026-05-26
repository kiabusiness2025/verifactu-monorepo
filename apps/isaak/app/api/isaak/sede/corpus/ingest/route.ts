// R2 — Endpoint admin para ingesta on-demand del corpus AEAT.
//
// POST /api/isaak/sede/corpus/ingest
//   body: { sourceId?: string, sourceTypes?: AeatSourceType[], replaceAll?: boolean }
//
// Requiere sesión + flag admin (no expuesto a tenants normales — solo
// el operador del sistema dispara ingestas, no cada cliente).
//
// Si se pasa sourceId, ingesta solo esa fuente. Si se pasan
// sourceTypes, ingesta todas las fuentes de esos tipos. Si no, ingesta
// todo el registry.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

export async function POST(req: NextRequest) {
  const admin = await isAdminSession();
  if (!admin) return NextResponse.json({ error: 'admin_required' }, { status: 403 });

  let body: {
    sourceId?: string;
    sourceTypes?: string[];
    replaceAll?: boolean;
  };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  try {
    const { ingestSource, ingestAllSources } = await import(
      '@/app/lib/aeat-corpus-ingester'
    );

    if (body.sourceId) {
      const result = await ingestSource({
        sourceId: body.sourceId,
        replaceAll: body.replaceAll === true,
      });
      return NextResponse.json(result);
    }

    const result = await ingestAllSources({
      sourceTypes: body.sourceTypes as never,
      replaceAll: body.replaceAll === true,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'ingest_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
