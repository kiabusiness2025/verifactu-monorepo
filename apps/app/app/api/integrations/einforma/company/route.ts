import { NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { getCompanyProfileByNif } from '@/server/einforma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taxId = (searchParams.get('taxId') ?? '').trim().toUpperCase();

    if (!taxId) {
      return NextResponse.json({ error: 'Falta taxId' }, { status: 400 });
    }

    const profile = await getCompanyProfileByNif(taxId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('eInforma company error:', error);
    return NextResponse.json({ error: 'No se pudo consultar eInforma' }, { status: 500 });
  }
}
