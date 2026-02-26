import { getPreview130 } from '@/lib/aeat/books';
import { parsePeriod } from '@/lib/aeat/period';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const period = request.nextUrl.searchParams.get('period');
    const parsed = parsePeriod(period);
    const summary = await getPreview130(auth.tenantId, parsed.from, parsed.to, parsed.label);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo generar preview 130' },
      { status: 400 }
    );
  }
}
