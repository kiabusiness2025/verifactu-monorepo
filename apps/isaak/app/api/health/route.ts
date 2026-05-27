import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function checkConfig(): { ok: boolean; missing: string[] } {
  const required = ['DATABASE_URL', 'FIREBASE_ADMIN_PROJECT_ID', 'RESEND_API_KEY'];
  const missing = required.filter((k) => !process.env[k]?.trim());

  // At least one AI key must be present
  const hasAiKey =
    !!process.env.ANTHROPIC_API_KEY?.trim() ||
    !!process.env.CLAVE_API_AI_VERCEL?.trim() ||
    !!process.env.ISAAK_NEW_OPENAI_API_KEY?.trim();
  if (!hasAiKey) missing.push('AI_KEY (ANTHROPIC_API_KEY or CLAVE_API_AI_VERCEL)');

  return { ok: missing.length === 0, missing };
}

export async function GET() {
  const [database, config] = await Promise.all([checkDatabase(), Promise.resolve(checkConfig())]);

  const ok = database.ok && config.ok;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      services: { database, config },
    },
    { status: ok ? 200 : 503 }
  );
}
