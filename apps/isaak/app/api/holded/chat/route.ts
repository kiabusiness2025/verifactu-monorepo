import { NextRequest, NextResponse } from 'next/server';
import { callOpenAIResponses, resolveOpenAIKey } from '@verifactu/utils';
import { recordUsageEvent } from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { buildYearAnalyticsSummary } from '@/app/lib/holded-analytics';
import {
  buildHoldedProbeSummary,
  probeHoldedConnection,
  type HoldedProbeModuleDiagnostic,
} from '@/app/lib/holded-integration';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  getSimpleMemoryContext,
  storeSimpleMemoryFact,
} from '@/app/lib/holded-chat';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function isConnectionDiagnosticRequest(message: string) {
  const text = message.toLowerCase();
  return (
    (text.includes('diagnost') && text.includes('conexion')) ||
    text.includes('conexion detall') ||
    text.includes('estado de conexion') ||
    text.includes('comprobar conexion') ||
    text.includes('revisar conexion') ||
    text.includes('test de conexion') ||
    text.includes('prueba de conexion')
  );
}

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

function joinSpanishList(values: string[]) {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`;
}

function describeSupportedModules(modules: string[] | null | undefined) {
  const labels = (modules || [])
    .map((module) => {
      switch (module) {
        case 'invoicing':
          return 'ventas, facturas y clientes';
        case 'accounting':
          return 'contabilidad';
        case 'crm':
          return 'CRM';
        case 'projects':
          return 'proyectos';
        case 'team':
          return 'equipo';
        default:
          return null;
      }
    })
    .filter(Boolean) as string[];

  return labels.length > 0 ? joinSpanishList(labels) : 'sin detalle todavia';
}

function describeCommunicationStyle(value: string | null | undefined) {
  switch (value) {
    case 'spanish_close_friendly':
      return 'cercano y muy humano';
    case 'spanish_professional_reassuring':
      return 'profesional y tranquilizador';
    case 'spanish_clear_non_technical':
      return 'claro y sin tecnicismos';
    default:
      return 'claro y cercano';
  }
}

function describeKnowledgeLevel(value: string | null | undefined) {
  switch (value) {
    case 'starter':
      return 'inicial';
    case 'intermediate':
      return 'intermedio';
    case 'advanced':
      return 'avanzado';
    default:
      return 'inicial';
  }
}

function describeRole(value: string | null | undefined) {
  switch (value) {
    case 'autonomo':
      return 'autonomo';
    case 'administrador':
      return 'administrador';
    case 'gerente':
      return 'gerente';
    case 'financiero':
      return 'responsable financiero';
    case 'otro':
      return 'responsable del negocio';
    default:
      return value || 'responsable del negocio';
  }
}

function formatProbeStatus(status: number | null) {
  return status === null ? 'sin respuesta' : `HTTP ${status}`;
}

function formatHealthLabel(value: 'ready' | 'partial' | 'blocked') {
  if (value === 'ready') return 'Lista';
  if (value === 'partial') return 'Parcial';
  return 'Bloqueada';
}

function buildConnectionDiagnostic(input: {
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>;
  snapshot: NonNullable<Awaited<ReturnType<typeof loadIsaakBusinessContext>>['holded']['snapshot']>;
  probe: Awaited<ReturnType<typeof probeHoldedConnection>> | null;
}) {
  const tenantLabel = input.context.labels.companyName?.trim() || 'tu empresa';
  const connection = input.context.holded.connection;
  const probe = input.probe;
  const probeSummary = probe ? buildHoldedProbeSummary(probe) : null;
  const findModuleDiagnostic = (key: HoldedProbeModuleDiagnostic['key']) =>
    probeSummary?.modules.find((module: HoldedProbeModuleDiagnostic) => module.key === key);
  const invoicingDiagnostic = findModuleDiagnostic('invoicing');
  const accountingDiagnostic = findModuleDiagnostic('accounting');
  const crmDiagnostic = findModuleDiagnostic('crm');
  const projectsDiagnostic = findModuleDiagnostic('projects');
  const teamDiagnostic = findModuleDiagnostic('team');

  let contactsDiagnostic =
    'No he lanzado ahora mismo una comprobacion en vivo de clientes o contactos.';

  if (invoicingDiagnostic?.ok) {
    contactsDiagnostic =
      input.snapshot.contacts.length > 0
        ? `He podido leer ${input.snapshot.contacts.length} clientes o contactos en la muestra actual.`
        : 'La conexion de ventas responde, pero en esta lectura rapida no han aparecido contactos.';
  } else if (probeSummary) {
    contactsDiagnostic =
      'No he podido revisar clientes porque la parte de ventas y facturas no ha respondido bien.';
  }

  return [
    `He revisado la conexion de Holded para ${tenantLabel} 😊`,
    '',
    `Estado general: ${probeSummary ? formatHealthLabel(probeSummary.health) : 'Pendiente de comprobar'}`,
    `Resumen: ${probeSummary ? probeSummary.summary : 'La conexion aparece guardada, pero ahora mismo no he podido lanzar el chequeo en vivo.'}`,
    `Modulos ya confirmados: ${describeSupportedModules(connection?.supportedModules)}.`,
    `Muestra actual: ${input.snapshot.invoices.length} facturas, ${input.snapshot.contacts.length} contactos y ${input.snapshot.accounts.length} cuentas.`,
    '',
    'Lo que acabo de comprobar:',
    probeSummary
      ? `- Facturas y clientes: ${invoicingDiagnostic?.detail} (${formatProbeStatus(invoicingDiagnostic?.status ?? null)})`
      : '- Facturas y clientes: No comprobado ahora mismo.',
    `- Contactos leidos: ${contactsDiagnostic}`,
    probeSummary
      ? `- Contabilidad: ${accountingDiagnostic?.detail} (${formatProbeStatus(accountingDiagnostic?.status ?? null)})`
      : '- Contabilidad: No comprobado ahora mismo.',
    probeSummary
      ? `- CRM: ${crmDiagnostic?.detail} (${formatProbeStatus(crmDiagnostic?.status ?? null)})`
      : '- CRM: No comprobado ahora mismo.',
    probeSummary
      ? `- Proyectos: ${projectsDiagnostic?.detail} (${formatProbeStatus(projectsDiagnostic?.status ?? null)})`
      : '- Proyectos: No comprobado ahora mismo.',
    probeSummary
      ? `- Equipo: ${teamDiagnostic?.detail} (${formatProbeStatus(teamDiagnostic?.status ?? null)})`
      : '- Equipo: No comprobado ahora mismo.',
    '',
    `Siguiente paso: ${probeSummary ? probeSummary.nextStep : 'Si quieres, repito el chequeo o paso directamente a un resumen del negocio con la lectura actual.'}`,
  ].join('\n');
}

function buildLlmInstructions(input: {
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>;
  snapshot: NonNullable<Awaited<ReturnType<typeof loadIsaakBusinessContext>>['holded']['snapshot']>;
  diagnosticProbe: Awaited<ReturnType<typeof probeHoldedConnection>> | null;
}) {
  const companyName = input.context.labels.companyName || 'tu empresa';
  const preferredName =
    input.context.isaak.profile?.preferredName || input.context.labels.firstName || 'la persona';
  const role = describeRole(
    input.context.isaak.profile?.roleInCompanyOther || input.context.isaak.profile?.roleInCompany
  );
  const communicationStyle = describeCommunicationStyle(
    input.context.isaak.instructions?.communicationStyle ||
      input.context.isaak.profile?.communicationStyle
  );
  const knowledgeLevel = describeKnowledgeLevel(
    input.context.isaak.instructions?.likelyKnowledgeLevel ||
      input.context.isaak.profile?.likelyKnowledgeLevel
  );
  const goals = input.context.isaak.profile?.mainGoals?.length
    ? input.context.isaak.profile.mainGoals.slice(0, 3).join(', ')
    : 'cuidar el negocio con tranquilidad';
  const analytics = input.context.holded.analytics;
  const modules = describeSupportedModules(input.context.holded.connection?.supportedModules);
  const probeSummary = input.diagnosticProbe
    ? buildHoldedProbeSummary(input.diagnosticProbe)
    : null;
  const probeDetails = probeSummary
    ? probeSummary.modules
        .map((module) => `${module.label}=${module.ok ? 'ok' : formatProbeStatus(module.status)}`)
        .join(' | ')
    : 'no ejecutado';

  return [
    'Eres Isaak, el copiloto fiscal y contable de confianza para pequenos negocios en Espana.',
    'Tu prioridad es bajar la ansiedad de la persona usuaria y convertir datos en decisiones claras.',
    'Responde en espanol natural, calmado, optimista, muy amable y nada robotico.',
    'Puedes usar 1 o 2 emojis suaves cuando aporten calidez, pero no abuses de ellos.',
    'No inventes datos ni funciones. Si faltan datos, dilo con claridad.',
    'Evita jerga de producto y tecnicismos innecesarios. Traduce todo a negocio real.',
    'Empieza por lo importante, despues explica el impacto y termina con un siguiente paso concreto.',
    'No suenes como un asistente generico ni como un modelo; suena humano, util y con criterio.',
    'Cuando ayude, aterriza la lectura a esta idea: ventas - gastos = beneficio.',
    'Cuando el usuario pida un diagnostico de conexion, detalla que has comprobado ahora mismo, que modulo responde, que modulo falla, como le afecta y que debe hacer despues.',
    'No digas solo "conexion parcial". Explica exactamente que parte funciona y que parte falta.',
    '',
    `Persona usuaria: ${preferredName}. Rol: ${role}. Estilo preferido: ${communicationStyle}. Nivel esperado: ${knowledgeLevel}. Objetivos: ${goals}.`,
    `Contexto empresa: ${companyName}.`,
    `Contexto negocio: ${input.context.summary}`,
    `Muestra disponible: facturas=${input.snapshot.invoices.length}, contactos=${input.snapshot.contacts.length}, cuentas=${input.snapshot.accounts.length}.`,
    `Modulos confirmados: ${modules}.`,
    analytics
      ? `Analitica: ventas_mes=${analytics.monthSales}, gastos_mes=${analytics.monthExpenses}, margen_mes=${analytics.monthMargin}, pendientes=${analytics.pendingCollectionsAmount}.`
      : 'Analitica: no disponible.',
    probeSummary
      ? `Chequeo vivo: ${probeSummary.summary} Siguiente paso sugerido: ${probeSummary.nextStep}`
      : 'Chequeo vivo: no ejecutado.',
    `Detalle del chequeo: ${probeDetails}.`,
    '',
    'Si el usuario te pide un resumen, usa cifras concretas, concluye que significa para el negocio y remata con una recomendacion accionable.',
    'Si el usuario pide diagnostico, nombra al menos facturas, contactos y contabilidad aunque alguno falle.',
  ].join('\n');
}

async function buildLlmReply(input: {
  message: string;
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>;
  snapshot: NonNullable<Awaited<ReturnType<typeof loadIsaakBusinessContext>>['holded']['snapshot']>;
  diagnosticProbe: Awaited<ReturnType<typeof probeHoldedConnection>> | null;
}) {
  const apiKey = resolveOpenAIKey(process.env);
  if (!apiKey) return null;

  const model = process.env.ISAAK_OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

  return callOpenAIResponses({
    apiKey,
    model,
    instructions: buildLlmInstructions({
      context: input.context,
      snapshot: input.snapshot,
      diagnosticProbe: input.diagnosticProbe,
    }),
    messages: [{ role: 'user', content: input.message }],
    temperature: 0.45,
    maxOutputTokens: 420,
  });
}

function buildReply(input: {
  message: string;
  snapshot: NonNullable<Awaited<ReturnType<typeof loadIsaakBusinessContext>>['holded']['snapshot']>;
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>;
  probe: Awaited<ReturnType<typeof probeHoldedConnection>> | null;
}) {
  const text = input.message.toLowerCase();
  const invoiceCount = input.snapshot.invoices.length;
  const contactCount = input.snapshot.contacts.length;
  const accountCount = input.snapshot.accounts.length;
  const summary = input.context.holded.analytics;
  const insight = summary?.insight || input.context.summary;
  const tenantLabel = input.context.labels.companyName?.trim() || 'tu empresa';
  const requestedYear = extractRequestedYear(input.message);

  if (isConnectionDiagnosticRequest(text)) {
    return buildConnectionDiagnostic({
      context: input.context,
      snapshot: input.snapshot,
      probe: input.probe,
    });
  }

  if (!summary) {
    return `La conexion con Holded esta activa en ${tenantLabel} 😊 Ya tengo tambien tu contexto de empresa y personalizacion de Isaak, pero todavia no he podido completar la lectura analitica. Si quieres, empezamos por facturas, clientes o configuracion.`;
  }

  if (requestedYear) {
    const yearSummary = buildYearAnalyticsSummary(input.snapshot, requestedYear);

    if (yearSummary.invoices === 0) {
      return [
        `No he encontrado documentos suficientes de ${tenantLabel} para ${requestedYear} dentro de la lectura actual de Holded.`,
        '',
        `Ahora mismo estoy leyendo ${input.snapshot.invoices.length} documentos en la muestra cargada. Si quieres, sigo ampliando la cobertura para darte el ejercicio completo con mas precision 🙂`,
      ].join('\n');
    }

    return [
      `Este es el resumen de ${tenantLabel} para ${requestedYear} ✨:`,
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
      return `Tu cuenta de Holded ya esta conectada, pero en la muestra inicial de ${tenantLabel} no veo facturas recientes todavia. Puedo ayudarte a revisar si faltan datos por sincronizar o ir directamente a cobros, clientes y configuracion 🙂`;
    }

    return `Tu cuenta de Holded ya esta conectada. En ${tenantLabel} ya detecto ${formatMoney(summary.monthSales)} en ventas de este mes y ${formatMoney(summary.pendingCollectionsAmount)} pendientes de cobro. Si quieres, sigo con el trimestre o revisamos una factura concreta 🙌`;
  }

  if (text.includes('cliente') || text.includes('contacto')) {
    return `La conexion esta activa. En la primera lectura de ${tenantLabel} he encontrado ${contactCount} contactos en la muestra rapida. Ya podemos revisar clientes y actividad sin salir de Isaak 😊`;
  }

  if (text.includes('cuenta') || text.includes('contabilidad') || text.includes('gasto')) {
    return `Con la conexion actual ya detecto ${formatMoney(summary.monthExpenses)} en gastos del mes y he podido validar ${accountCount} cuentas contables en ${tenantLabel}. Si quieres, sigo con margen, trimestre o gastos pendientes de revisar ✨`;
  }

  return `La conexion con Holded esta activa y ya puedo trabajar con una lectura real de ${tenantLabel}: ${formatMoney(summary.monthSales)} en ventas este mes, ${formatMoney(summary.pendingCollectionsAmount)} pendientes de cobro y ${formatMoney(summary.monthMargin)} de margen estimado. Preguntame por trimestre, gastos, cobros o clientes y empezamos 😊`;
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await getHoldedSession();
  } catch (error) {
    console.error('[holded/chat] session resolution failed', error);
    return NextResponse.json(
      { error: 'No he podido verificar tu sesion. Intenta accediendo de nuevo.' },
      { status: 503 }
    );
  }

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para usar el chat.' },
      { status: 401 }
    );
  }

  let context;
  try {
    context = await loadIsaakBusinessContext(
      {
        tenantId: session.tenantId,
        userId: session.userId,
        name: session.name,
        email: session.email,
      },
      { includeSnapshot: true }
    );
  } catch (error) {
    console.error('[holded/chat] context load failed', {
      tenantId: session.tenantId,
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'No he podido cargar el contexto de tu negocio en este momento. Intenta de nuevo.' },
      { status: 503 }
    );
  }

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
    console.error('[holded/chat] snapshot is null', {
      tenantId: session.tenantId,
      userId: session.userId,
      hasConnection: Boolean(context.holded.connection?.apiKey),
      connectionStatus: context.holded.connection?.status,
    });
    return NextResponse.json(
      {
        error:
          'No he podido recuperar todavia la lectura analitica de Holded. Por favor, revisa la conexion.',
      },
      { status: 503 }
    );
  }

  let reply: string;
  let connectionProbe: Awaited<ReturnType<typeof probeHoldedConnection>> | null = null;

  if (isConnectionDiagnosticRequest(message)) {
    try {
      connectionProbe = await probeHoldedConnection(context.holded.connection.apiKey);
    } catch (error) {
      console.warn('[holded/chat] live probe failed', {
        tenantId: session.tenantId,
        userId: session.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const llmReply = await buildLlmReply({
      message,
      context,
      snapshot,
      diagnosticProbe: connectionProbe,
    }).catch((error) => {
      console.warn('[holded/chat] responses api failed, using deterministic fallback', {
        tenantId: session.tenantId,
        userId: session.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });

    reply =
      typeof llmReply === 'string' && llmReply.trim()
        ? llmReply.trim()
        : buildReply({
            message,
            snapshot,
            context,
            probe: connectionProbe,
          });
  } catch (error) {
    console.error('[holded/chat] reply build failed', {
      tenantId: session.tenantId,
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'No he podido procesar tu pregunta en este momento. Intenta de nuevo.' },
      { status: 503 }
    );
  }

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
