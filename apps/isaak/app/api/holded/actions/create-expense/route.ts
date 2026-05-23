import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { holdedCreateExpense } from '@/app/lib/holded-api';
import type { ExtractedExpense } from '@/app/api/holded/upload-expense/route';

export const runtime = 'nodejs';

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
  }

  const { expense, contactId } = body as { expense?: unknown; contactId?: string };

  if (!expense || typeof expense !== 'object') {
    return NextResponse.json({ error: 'El campo "expense" es obligatorio.' }, { status: 400 });
  }

  const e = expense as Partial<ExtractedExpense>;

  if (!e.supplierName || typeof e.supplierName !== 'string') {
    return NextResponse.json({ error: 'supplierName es obligatorio.' }, { status: 400 });
  }
  if (!e.description || typeof e.description !== 'string') {
    return NextResponse.json({ error: 'description es obligatorio.' }, { status: 400 });
  }
  if (typeof e.amountTotal !== 'number' || e.amountTotal <= 0) {
    return NextResponse.json(
      { error: 'amountTotal debe ser un número mayor que 0.' },
      { status: 400 }
    );
  }

  const connection = await getHoldedConnection(session.tenantId, 'dashboard').catch(() => null);
  if (!connection?.apiKey || connection.status === 'disconnected') {
    return NextResponse.json(
      { error: 'Conecta tu cuenta de Holded antes de registrar gastos.' },
      { status: 400 }
    );
  }

  const issueDate =
    typeof e.issueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.issueDate)
      ? e.issueDate
      : new Date().toISOString().slice(0, 10);

  const amountNet =
    typeof e.amountNet === 'number'
      ? e.amountNet
      : Math.round((e.amountTotal / (1 + (e.vatRate ?? 0.21))) * 100) / 100;

  const vatRate = typeof e.vatRate === 'number' ? e.vatRate : 0.21;

  const notes = [e.description, e.invoiceNumber ? `Ref: ${e.invoiceNumber}` : '']
    .filter(Boolean)
    .join(' · ');

  try {
    const result = await holdedCreateExpense(connection.apiKey, {
      contactId: typeof contactId === 'string' ? contactId : undefined,
      contactName: e.supplierName,
      date: Math.floor(new Date(issueDate).getTime() / 1000),
      notes,
      currency: e.currency ?? 'EUR',
      items: [
        {
          name: e.description,
          units: 1,
          subtotal: amountNet,
          tax: Math.round(vatRate * 100),
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      holdedId: result.id,
      docNumber: result.docNumber,
      reply: [
        `✅ Gasto registrado en Holded correctamente.`,
        '',
        `- **Proveedor:** ${e.supplierName}`,
        `- **Total:** ${fmt(e.amountTotal)}`,
        result.id ? `- **ID Holded:** \`${result.id}\`` : '',
        result.docNumber ? `- **Nº documento:** ${result.docNumber}` : '',
        '',
        'Puedes verlo en la sección de Compras de Holded.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (err) {
    console.error('[holded/actions/create-expense] failed', {
      tenantId: session.tenantId,
      supplierName: e.supplierName,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error al registrar el gasto. Puedes añadirlo manualmente en Holded.',
      },
      { status: 502 }
    );
  }
}
