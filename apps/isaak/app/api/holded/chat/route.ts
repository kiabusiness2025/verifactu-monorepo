import { NextRequest, NextResponse } from 'next/server';
import { fetchHoldedSnapshot, getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  getSimpleMemoryContext,
  storeSimpleMemoryFact,
} from '@/app/lib/holded-chat';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function extractNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function readInvoiceAmount(invoice: Record<string, unknown>) {
  const candidates = [
    invoice.amountGross,
    invoice.total,
    invoice.totalWithTax,
    invoice.amount,
    invoice.totalAmount,
    invoice.totalFormatted,
  ];

  for (const candidate of candidates) {
    const value = extractNumber(candidate);
    if (value > 0) return value;
  }

  return 0;
}

function readInvoiceStatus(invoice: Record<string, unknown>) {
  const candidates = [invoice.status, invoice.docStatus, invoice.paymentStatus];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return '';
}

function buildSnapshotSummary(snapshot: Awaited<ReturnType<typeof fetchHoldedSnapshot>>) {
  const sales = snapshot.invoices.reduce((sum, invoice) => {
    if (!invoice || typeof invoice !== 'object') return sum;
    return sum + readInvoiceAmount(invoice);
  }, 0);

  const pendingInvoices = snapshot.invoices.filter((invoice) => {
    if (!invoice || typeof invoice !== 'object') return false;
    const status = readInvoiceStatus(invoice);
    return ['pending', 'open', 'unpaid', 'overdue', 'draft'].some((keyword) =>
      status.includes(keyword)
    );
  }).length;

  return {
    sales,
    pendingInvoices,
    invoices: snapshot.invoices.length,
    contacts: snapshot.contacts.length,
    accounts: snapshot.accounts.length,
  };
}

function buildAutomaticInsight(summary: ReturnType<typeof buildSnapshotSummary>) {
  if (summary.pendingInvoices >= 3) {
    return 'Tienes varias facturas pendientes de cobro y conviene revisarlas cuanto antes.';
  }

  if (summary.sales > 0 && summary.pendingInvoices > 0) {
    return 'Ya hay ventas registradas y la prioridad ahora mismo es vigilar mejor los cobros pendientes.';
  }

  if (summary.invoices >= 5) {
    return 'Ya veo bastante movimiento en tu cuenta y un resumen periodico te puede ahorrar mucho tiempo.';
  }

  if (summary.contacts >= 10) {
    return 'Tienes varios contactos activos y puede merecer la pena ordenar mejor clientes y seguimiento.';
  }

  return 'Todavia estoy montando una primera lectura de tu negocio, pero ya puedo ayudarte con preguntas concretas.';
}

function buildReply(input: {
  message: string;
  snapshot: Awaited<ReturnType<typeof fetchHoldedSnapshot>>;
  tenantName?: string | null;
  memoryContext: Awaited<ReturnType<typeof getSimpleMemoryContext>>;
}) {
  const text = input.message.toLowerCase();
  const invoiceCount = input.snapshot.invoices.length;
  const contactCount = input.snapshot.contacts.length;
  const accountCount = input.snapshot.accounts.length;
  const summary = buildSnapshotSummary(input.snapshot);
  const insight = buildAutomaticInsight(summary);
  const tenantLabel = input.tenantName?.trim() || 'tu empresa';

  if (
    text.includes('resumen') ||
    text.includes('este mes') ||
    text.includes('resumen rapido') ||
    text.includes('ver resumen')
  ) {
    const hasEnoughSummaryData =
      summary.invoices > 0 || summary.contacts > 0 || summary.accounts > 0 || summary.sales > 0;

    if (!hasEnoughSummaryData) {
      return [
        `Todavia no tengo suficientes datos para darte un resumen completo de ${tenantLabel}.`,
        '',
        'Aun asi, ya puedo ayudarte a revisar facturas, cobros, clientes o cualquier duda puntual que tengas.',
        '',
        `Insight inicial: ${insight}`,
      ].join('\n');
    }

    return [
      `Este es tu resumen rapido de ${tenantLabel}:`,
      '',
      `- Ventas aproximadas en la muestra: ${summary.sales.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} EUR`,
      `- Facturas revisadas: ${summary.invoices}`,
      `- Facturas pendientes detectadas: ${summary.pendingInvoices}`,
      `- Contactos visibles: ${summary.contacts}`,
      '',
      `Insight: ${insight}`,
      '',
      'Si quieres, puedo seguir con cobros pendientes, ventas o una factura concreta.',
    ].join('\n');
  }

  if (text.includes('factura') || text.includes('venta') || text.includes('cobro')) {
    if (invoiceCount === 0) {
      return `Tu cuenta de Holded ya esta conectada, pero en la muestra inicial de ${tenantLabel} no veo facturas recientes todavia. Puedo ayudarte a revisar si faltan datos por sincronizar o ir directamente a cobros, clientes y configuracion.`;
    }

    return `Tu cuenta de Holded ya esta conectada. En ${tenantLabel} he detectado ${invoiceCount} facturas recientes en la muestra inicial. Si quieres, puedo resumirte ventas, cobros pendientes o revisar una factura concreta.`;
  }

  if (text.includes('cliente') || text.includes('contacto')) {
    return `La conexion esta activa. En la primera lectura de ${tenantLabel} he encontrado ${contactCount} contactos en la muestra rapida. Ya podemos revisar clientes y actividad sin salir de Isaak.`;
  }

  if (text.includes('cuenta') || text.includes('contabilidad') || text.includes('gasto')) {
    return `Con la conexion actual he podido validar ${accountCount} cuentas contables en la muestra basica de ${tenantLabel}. A partir de aqui puedo convertir esos datos en respuestas mas claras para negocio.`;
  }

  return `La conexion con Holded esta activa y ya puedo trabajar sobre una primera muestra de ${invoiceCount} facturas, ${contactCount} contactos y ${accountCount} cuentas en ${tenantLabel}. Preguntame por ventas, cobros, gastos o clientes y empezamos.`;
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para usar el chat.' },
      { status: 401 }
    );
  }

  const connection = await getHoldedConnection(session.tenantId);
  if (!connection?.apiKey) {
    return NextResponse.json(
      { error: 'Antes de usar el chat necesitas conectar tu API key de Holded.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const requestedConversationId =
    typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
  const hadChatsBefore = await prisma.isaakConversation.count({
    where: {
      tenantId: session.tenantId,
      userId: session.userId,
      context: 'holded_free_dashboard',
    },
  });

  if (!message) {
    return NextResponse.json({ error: 'Escribe una pregunta para continuar.' }, { status: 400 });
  }

  const conversation = await ensureHoldedConversation(
    {
      tenantId: session.tenantId,
      userId: session.userId,
    },
    {
      conversationId: requestedConversationId || null,
      titleSeed: message,
    }
  );

  await appendConversationMessage({
    conversationId: conversation.id,
    role: 'user',
    content: message,
  });

  const [snapshot, memoryContext] = await Promise.all([
    fetchHoldedSnapshot(connection.apiKey),
    getSimpleMemoryContext(
      {
        tenantId: session.tenantId,
        userId: session.userId,
      },
      conversation.id
    ),
  ]);

  const reply = buildReply({
    message,
    snapshot,
    tenantName: connection.tenantName,
    memoryContext,
  });

  const assistantMessage = await appendConversationMessage({
    conversationId: conversation.id,
    role: 'assistant',
    content: reply,
    metadata: {
      source: 'isaak_workspace_mvp',
      snapshot: {
        invoices: snapshot.invoices.length,
        contacts: snapshot.contacts.length,
        accounts: snapshot.accounts.length,
      },
    },
  });

  await Promise.all([
    storeSimpleMemoryFact({
      tenantId: session.tenantId,
      userId: session.userId,
      conversationId: conversation.id,
      category: 'chat_preference',
      factKey: 'last_user_topic',
      value: {
        text: message,
      },
      confidence: 0.55,
    }),
    storeSimpleMemoryFact({
      tenantId: session.tenantId,
      userId: session.userId,
      conversationId: conversation.id,
      category: 'holded_snapshot',
      factKey: 'latest_snapshot_counts',
      value: {
        invoices: snapshot.invoices.length,
        contacts: snapshot.contacts.length,
        accounts: snapshot.accounts.length,
      },
      confidence: 0.85,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
    },
    reply,
    assistantMessage,
    snapshot: {
      invoices: snapshot.invoices.length,
      contacts: snapshot.contacts.length,
      accounts: snapshot.accounts.length,
    },
    memory: {
      scope: 'user_private',
      mode: 'mvp',
      hadChatsBefore,
    },
  });
}
