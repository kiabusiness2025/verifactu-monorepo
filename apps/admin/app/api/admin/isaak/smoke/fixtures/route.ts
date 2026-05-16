/**
 * GET /api/admin/isaak/smoke/fixtures
 * Lista los fixtures grabados en apps/admin/e2e/fixtures/isaak/*.json
 */

import { requireAdmin } from '@/lib/adminAuth';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type IsaakFixture = {
  id: string;
  label: string;
  question: string;
  expected_tools: string[];
  expected_keywords: string[];
  recorded_at: string | null;
  recorded_response: string | null;
  recorded_tool_results: Record<string, unknown> | null;
};

const FIXTURES_DIR = path.join(process.cwd(), 'e2e', 'fixtures', 'isaak');

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    if (!existsSync(FIXTURES_DIR)) {
      return NextResponse.json({ fixtures: [] });
    }

    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'));
    const fixtures: IsaakFixture[] = [];

    for (const file of files.sort()) {
      try {
        const raw = readFileSync(path.join(FIXTURES_DIR, file), 'utf-8');
        const data = JSON.parse(raw) as IsaakFixture;
        fixtures.push(data);
      } catch {
        // Skip malformed fixture files
      }
    }

    return NextResponse.json({ fixtures });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ fixtures: [] });
  }
}
