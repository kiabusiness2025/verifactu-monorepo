import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { holdedListDocuments } from '@/app/lib/holded-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function periodRange(period: string): { starttmp?: string; endtmp?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case 'current_month': {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { starttmp: start.toISOString(), endtmp: end.toISOString() };
    }
    case 'previous_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { starttmp: start.toISOString(), endtmp: end.toISOString() };
    }
    case 'current_quarter': {
      const q = Math.floor(m / 3);
      const start = new Date(y, q * 3, 1);
      const end = new Date(y, q * 3 + 3, 0);
      return { starttmp: start.toISOString(), endtmp: end.toISOString() };
    }
    case 'previous_quarter': {
      const q = Math.floor(m / 3) - 1;
      const qy = q < 0 ? y - 1 : y;
      const qm = ((q % 4) + 4) % 4;
      const start = new Date(qy, qm * 3, 1);
      const end = new Date(qy, qm * 3 + 3, 0);
      return { starttmp: start.toISOString(), endtmp: end.toISOString() };
    }
    case 'current_year': {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { starttmp: start.toISOString(), endtmp: end.toISOString() };
    }
    default:
      return {};
  }
}

export async function GET(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const connection = await getHoldedConnection(session.tenantId);
  if (!connection?.apiKey) {
    return NextResponse.json(
      { error: 'no_holded', message: 'Holded no conectado.' },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'current_month';
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const range = periodRange(period);

  try {
    const result = await holdedListDocuments(connection.apiKey, {
      docType: 'purchase',
      ...range,
      limit: 200,
    });

    const docs = (result.documents as Record<string, unknown>[]).map((d) => {
      const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
      const totalNet = typeof d.subtotal === 'number' ? d.subtotal : null;
      const totalTax =
        typeof d.taxesAmount === 'number'
          ? d.taxesAmount
          : typeof d.totalTax === 'number'
            ? d.totalTax
            : null;
      const totalGross =
        typeof d.total === 'number'
          ? d.total
          : typeof d.totalAmount === 'number'
            ? d.totalAmount
            : null;

      return {
        id: String(d.id ?? d.docId ?? ''),
        number: String(d.docNum ?? d.number ?? d.num ?? ''),
        date:
          typeof d.date === 'number'
            ? new Date(d.date * 1000).toISOString().slice(0, 10)
            : typeof d.date === 'string'
              ? d.date
              : null,
        supplierName: String(d.contact ?? d.contactName ?? d.supplier ?? ''),
        supplierId: typeof d.contactId === 'string' ? d.contactId : null,
        totalNet,
        totalTax,
        totalGross,
        status: String(d.status ?? d.docStatus ?? ''),
        currency: String(d.currency ?? 'EUR'),
        description:
          items.length > 0
            ? String(
                (items[0] as Record<string, unknown>).name ??
                  (items[0] as Record<string, unknown>).desc ??
                  ''
              )
            : '',
      };
    });

    const filtered = search
      ? docs.filter(
          (d) =>
            d.supplierName.toLowerCase().includes(search) ||
            d.number.toLowerCase().includes(search) ||
            d.description.toLowerCase().includes(search)
        )
      : docs;

    const totalAmount = filtered.reduce((sum, d) => sum + (d.totalGross ?? 0), 0);
    const suppliers = [...new Set(filtered.map((d) => d.supplierName).filter(Boolean))].sort();

    return NextResponse.json({
      ok: true,
      data: {
        items: filtered,
        total: filtered.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        suppliers,
        truncated: result.truncated,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando gastos';
    return NextResponse.json({ error: 'fetch_failed', message }, { status: 500 });
  }
}
