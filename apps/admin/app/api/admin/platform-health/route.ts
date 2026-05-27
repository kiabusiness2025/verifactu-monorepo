/**
 * GET /api/admin/platform-health
 *
 * Comprueba el estado de todas las apps del monorepo en paralelo.
 * Cache 60s. Sin auth (solo datos de disponibilidad, no sensibles).
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AppCheck = {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  sha?: string;
  error?: string;
};

async function checkUrl(name: string, url: string, timeoutMs = 5000): Promise<AppCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 60 },
    });
    const latencyMs = Date.now() - start;
    let sha: string | undefined;
    try {
      const body = (await res.clone().json()) as { sha?: string };
      sha = body.sha;
    } catch {
      // not JSON or no sha — ignore
    }
    return { name, url, ok: res.ok, status: res.status, latencyMs, sha };
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      status: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const ISAAK_URL = process.env.NEXT_PUBLIC_ISAAK_URL ?? 'https://isaak.verifactu.business';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.verifactu.business';

  const checks = await Promise.all([
    checkUrl('Isaak', `${ISAAK_URL}/api/health`),
    checkUrl('Landing', 'https://verifactu.business/api/health'),
    checkUrl('Holded site', 'https://holded.verifactu.business/api/health'),
    checkUrl(
      'Claude MCP',
      'https://claude.verifactu.business/.well-known/oauth-authorization-server'
    ),
    checkUrl('ChatGPT conector', `${APP_URL}/api/health`),
  ]);

  const allOk = checks.every((c) => c.ok);

  return NextResponse.json(
    { ok: allOk, timestamp: new Date().toISOString(), apps: checks },
    { status: allOk ? 200 : 207 }
  );
}
