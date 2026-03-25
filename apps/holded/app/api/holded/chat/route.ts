import { NextRequest, NextResponse } from 'next/server';
import { fetchHoldedSnapshot, getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  getSimpleMemoryContext,
  storeSimpleMemoryFact,
} from '@/app/lib/holded-chat';

export const runtime = 'nodejs';

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
  const recentFacts = input.memoryContext.recentFacts
    .map((fact) => `${fact.category}:${fact.factKey}`)
    .slice(0, 3);
  const memoryHint =
    recentFacts.length > 0
      ? ` Ya tengo en cuenta este contexto reciente: ${recentFacts.join(', ')}.`
      : '';
  const tenantLabel = input.tenantName?.trim() || 'tu cuenta';

  if (text.includes('factura') || text.includes('venta') || text.includes('cobro')) {
    return `Tu cuenta de Holded ya esta conectada. En ${tenantLabel} he podido ver ${invoiceCount} facturas recientes en la muestra inicial.${memoryHint} Si quieres, el siguiente paso es pedirme un resumen simple de ventas o cobros pendientes.`;
  }

  if (text.includes('cliente') || text.includes('contacto')) {
    return `La conexion esta activa. En la primera lectura de ${tenantLabel} he encontrado ${contactCount} contactos en la muestra rapida.${memoryHint} Ya podemos revisar clientes y actividad sin salir del dashboard.`;
  }

  if (text.includes('cuenta') || text.includes('contabilidad') || text.includes('gasto')) {
    return `Con la conexion actual he podido validar ${accountCount} cuentas contables en la muestra basica de ${tenantLabel}.${memoryHint} A partir de aqui podemos convertir esos datos en respuestas mas claras para negocio.`;
  }

  return `La conexion con Holded esta activa y el dashboard ya puede trabajar sobre una primera muestra de ${invoiceCount} facturas, ${contactCount} contactos y ${accountCount} cuentas en ${tenantLabel}.${memoryHint} Preguntame por ventas, cobros, gastos o clientes y empezamos.`;
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
      source: 'holded_dashboard_mvp',
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
    },
  });
}
