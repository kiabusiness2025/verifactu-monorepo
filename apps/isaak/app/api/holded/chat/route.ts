import { NextRequest, NextResponse } from 'next/server';
import { recordUsageEvent } from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { buildYearAnalyticsSummary } from '@/app/lib/holded-analytics';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  getSimpleMemoryContext,
  storeSimpleMemoryFact,
} from '@/app/lib/holded-chat';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function isSummaryRequest(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes('resumen') ||
    text.includes('ver resumen') ||
    text.includes('resumen rapido') ||
    text.includes('este mes') ||
    text.includes('trimestre') ||
    text.includes('año') ||
    text.includes('ano') ||
    text.includes('ejercicio') ||
    /\b20\d{2}\b/.test(text) ||
    text.includes('beneficio') ||
    text.includes('margen') ||
    text.includes('gasto')
  );
}

function extractRequestedYear(message: string, now = new Date()) {
  const text = message.toLowerCase();
  const explicitYear = text.match(/\b(20\d{2})\b/);

  if (explicitYear) {
    return Number(explicitYear[1]);
  }

  if (
    text.includes('año pasado') ||
    text.includes('ano pasado') ||
    text.includes('ejercicio pasado')
  ) {
    return now.getFullYear() - 1;
  }

  if (text.includes('este año') || text.includes('este ano') || text.includes('ejercicio actual')) {
    return now.getFullYear();
  }

  return null;
}

function formatMoney(amount: number | null | undefined) {
  if (typeof amount !== 'number') return 'Todavia no disponible';
  return `${amount.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} EUR`;
}

function buildReply(input: {
  message: string;
  snapshot: NonNullable<Awaited<ReturnType<typeof loadIsaakBusinessContext>>['holded']['snapshot']>;
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>;
}) {
  const text = input.message.toLowerCase();
  const invoiceCount = input.snapshot.invoices.length;
  const contactCount = input.snapshot.contacts.length;
  const accountCount = input.snapshot.accounts.length;
  const summary = input.context.holded.analytics;
  const insight = summary?.insight || input.context.summary;
  const tenantLabel = input.context.labels.companyName?.trim() || 'tu empresa';
  const requestedYear = extractRequestedYear(input.message);

  if (!summary) {
    return `La conexion con Holded esta activa en ${tenantLabel}. Ya tengo tambien tu contexto de empresa y personalizacion de Isaak, pero todavia no he podido completar la lectura analitica. Si quieres, empezamos por facturas, clientes o configuracion.`;
  }

  if (requestedYear) {
    const yearSummary = buildYearAnalyticsSummary(input.snapshot, requestedYear);

    if (yearSummary.invoices === 0) {
      return [
        `No he encontrado documentos suficientes de ${tenantLabel} para ${requestedYear} dentro de la lectura actual de Holded.`,
        '',
        `Ahora mismo estoy leyendo ${input.snapshot.invoices.length} documentos en la muestra cargada. Si quieres, sigo ampliando la cobertura para darte el ejercicio completo con mas precision.`,
      ].join('\n');
    }

    return [
      `Este es el resumen de ${tenantLabel} para ${requestedYear}:`,
      '',
      `- Ventas del ejercicio: ${formatMoney(yearSummary.sales)}`,
      `- Gastos detectados: ${formatMoney(yearSummary.expenses)}`,
      `- Margen estimado: ${formatMoney(yearSummary.margin)}`,
      `- Cobros pendientes en la muestra: ${formatMoney(yearSummary.pendingCollectionsAmount)}`,
      `- Facturas o documentos analizados: ${yearSummary.invoices}`,
      '',
      yearSummary.expenseSignals > 0
        ? 'Si quieres, puedo seguir con un desglose por trimestre o por meses.'
        : 'Todavia no tengo suficiente señal de gastos para darte un margen contable fino. Si quieres, sigo con ventas por trimestre o con cobros pendientes.',
    ].join('\n');
  }

  if (isSummaryRequest(text)) {
    const hasEnoughSummaryData =
      summary.invoices > 0 ||
      summary.contacts > 0 ||
      summary.accounts > 0 ||
      summary.monthSales > 0 ||
      summary.quarterSales > 0;

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
      `- Ventas de este mes: ${formatMoney(summary.monthSales)}`,
      `- Ventas del trimestre actual: ${formatMoney(summary.quarterSales)}`,
      `- Gastos de este mes: ${formatMoney(summary.monthExpenses)}`,
      `- Margen estimado del mes: ${formatMoney(summary.monthMargin)}`,
      `- Cobros pendientes: ${formatMoney(summary.pendingCollectionsAmount)}`,
      `- Facturas pendientes detectadas: ${summary.pendingCollectionsCount}`,
      `- Contactos visibles: ${summary.contacts}`,
      '',
      `Insight: ${insight}`,
      '',
      'Si quieres, puedo seguir con resultados del trimestre, cobros pendientes o una factura concreta.',
    ].join('\n');
  }

  if (text.includes('factura') || text.includes('venta') || text.includes('cobro')) {
    if (invoiceCount === 0) {
      return `Tu cuenta de Holded ya esta conectada, pero en la muestra inicial de ${tenantLabel} no veo facturas recientes todavia. Puedo ayudarte a revisar si faltan datos por sincronizar o ir directamente a cobros, clientes y configuracion.`;
    }

    return `Tu cuenta de Holded ya esta conectada. En ${tenantLabel} ya detecto ${formatMoney(summary.monthSales)} en ventas de este mes y ${formatMoney(summary.pendingCollectionsAmount)} pendientes de cobro. Si quieres, sigo con el trimestre o revisamos una factura concreta.`;
  }

  if (text.includes('cliente') || text.includes('contacto')) {
    return `La conexion esta activa. En la primera lectura de ${tenantLabel} he encontrado ${contactCount} contactos en la muestra rapida. Ya podemos revisar clientes y actividad sin salir de Isaak.`;
  }

  if (text.includes('cuenta') || text.includes('contabilidad') || text.includes('gasto')) {
    return `Con la conexion actual ya detecto ${formatMoney(summary.monthExpenses)} en gastos del mes y he podido validar ${accountCount} cuentas contables en ${tenantLabel}. Si quieres, sigo con margen, trimestre o gastos pendientes de revisar.`;
  }

  return `La conexion con Holded esta activa y ya puedo trabajar con una lectura real de ${tenantLabel}: ${formatMoney(summary.monthSales)} en ventas este mes, ${formatMoney(summary.pendingCollectionsAmount)} pendientes de cobro y ${formatMoney(summary.monthMargin)} de margen estimado. Preguntame por trimestre, gastos, cobros o clientes y empezamos.`;
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para usar el chat.' },
      { status: 401 }
    );
  }

  const context = await loadIsaakBusinessContext(
    {
      tenantId: session.tenantId,
      userId: session.userId,
      name: session.name,
      email: session.email,
    },
    { includeSnapshot: true }
  );

  if (!context.holded.connection?.apiKey) {
    return NextResponse.json(
      { error: 'Antes de usar el chat necesitas conectar tu API key de Holded.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const requestedConversationId =
    typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';

  const hadChatsBefore = await prisma.isaakConversation
    .count({
      where: {
        tenantId: session.tenantId,
        userId: session.userId,
        context: 'holded_free_dashboard',
      },
    })
    .catch((error) => {
      console.warn('[isaak chat] conversation count unavailable', {
        tenantId: session.tenantId,
        userId: session.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    });

  if (!message) {
    return NextResponse.json({ error: 'Escribe una pregunta para continuar.' }, { status: 400 });
  }

  let conversation: Awaited<ReturnType<typeof ensureHoldedConversation>> | null = null;
  try {
    conversation = await ensureHoldedConversation(
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
  } catch (error) {
    console.warn('[isaak chat] conversation persistence unavailable', {
      tenantId: session.tenantId,
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const snapshot = context.holded.snapshot;

  if (!snapshot) {
    return NextResponse.json(
      { error: 'No he podido recuperar todavia la lectura analitica de Holded.' },
      { status: 503 }
    );
  }

  const reply = buildReply({
    message,
    snapshot,
    context,
  });

  let assistantMessage: Awaited<ReturnType<typeof appendConversationMessage>> | null = null;

  if (conversation) {
    try {
      assistantMessage = await appendConversationMessage({
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
        getSimpleMemoryContext(
          {
            tenantId: session.tenantId,
            userId: session.userId,
          },
          conversation.id
        ),
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
            companyName: context.labels.companyName,
            summary: context.summary,
          },
          confidence: 0.85,
        }),
        ...(hadChatsBefore === 0
          ? [
              recordUsageEvent({
                prisma,
                tenantId: session.tenantId,
                userId: session.userId,
                type: 'FIRST_CHAT_CREATED',
                source: 'isaak_holded_chat',
                path: '/api/holded/chat',
                metadataJson: {
                  conversationId: conversation.id,
                },
              }),
              recordUsageEvent({
                prisma,
                tenantId: session.tenantId,
                userId: session.userId,
                type: 'FIRST_MESSAGE_SENT',
                source: 'isaak_holded_chat',
                path: '/api/holded/chat',
                metadataJson: {
                  conversationId: conversation.id,
                  messageLength: message.length,
                },
              }),
            ]
          : []),
        ...(isSummaryRequest(message)
          ? [
              recordUsageEvent({
                prisma,
                tenantId: session.tenantId,
                userId: session.userId,
                type: 'SUMMARY_REQUESTED',
                source: 'isaak_holded_chat',
                path: '/api/holded/chat',
                metadataJson: {
                  conversationId: conversation.id,
                  message,
                },
              }),
            ]
          : []),
      ]).catch((error) => {
        console.warn('[isaak chat] post-reply persistence unavailable', {
          tenantId: session.tenantId,
          userId: session.userId,
          conversationId: conversation?.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } catch (error) {
      console.warn('[isaak chat] assistant message persistence unavailable', {
        tenantId: session.tenantId,
        userId: session.userId,
        conversationId: conversation?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    conversation: conversation
      ? {
          id: conversation.id,
          title: conversation.title,
        }
      : null,
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
