import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@verifactu/utils';
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
}): Promise<string | null> {
  try {
    const result = await callLLM({
      instructions: buildLlmInstructions({
        context: input.context,
        snapshot: input.snapshot,
        diagnosticProbe: input.diagnosticProbe,
      }),
      messages: [{ role: 'user', content: input.message }],
      temperature: 0.45,
      maxOutputTokens: 420,
    });
    return result.text;
  } catch {
    return null;
  }
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

// ── Invoice tool support ─────────────────────────────────────────

function isInvoiceCreationIntent(message: string) {
  const text = message.toLowerCase();
  const action =
    text.includes('crea') ||
    text.includes('nueva') ||
    text.includes('emite') ||
    text.includes('genera') ||
    text.includes('hacer');
  const invoiceWord = text.includes('factura') || text.includes('invoice');
  const directRef =
    invoiceWord && (text.includes(' a ') || text.includes(' para ')) && /\d/.test(text);
  return (action && invoiceWord) || directRef;
}

function isIssueConfirmation(message: string) {
  return /^(s[ií]|confirmar?|emitir?|ok|enviar|adelante|procede|dale|venga|hazlo)[\s.!]*$/i.test(
    message.trim()
  );
}

type InvoiceExtractResult = {
  customerName: string;
  customerNif?: string;
  description: string;
  amountNet: number;
  taxRate: number;
  issueDate: string;
};

async function callAnthropicForInvoiceData(
  message: string,
  companyName: string,
  apiKey: string,
  model: string
): Promise<InvoiceExtractResult | null> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system: `Eres un extractor de datos de facturas para ${companyName}. Extrae exactamente los campos pedidos del mensaje del usuario.`,
      messages: [{ role: 'user', content: message }],
      tools: [
        {
          name: 'propose_invoice',
          description: 'Extrae los datos de la factura del mensaje del usuario.',
          input_schema: {
            type: 'object',
            properties: {
              customerName: { type: 'string', description: 'Nombre del cliente o empresa' },
              customerNif: { type: 'string', description: 'NIF o CIF del cliente, si se menciona' },
              description: {
                type: 'string',
                description: 'Descripción de los servicios o productos facturados',
              },
              amountNet: { type: 'number', description: 'Importe neto en EUR, sin IVA' },
              taxRate: {
                type: 'number',
                description:
                  'Tipo de IVA como decimal: 0.21 para 21%, 0.10 para 10%, 0 para sin IVA. Por defecto 0.21.',
              },
              issueDate: {
                type: 'string',
                description: `Fecha en YYYY-MM-DD. Por defecto hoy ${today}.`,
              },
            },
            required: ['customerName', 'description', 'amountNet'],
          },
        },
      ],
      tool_choice: { type: 'auto' },
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    content?: Array<{ type: string; input?: unknown }>;
  };
  const toolUse = data.content?.find((b) => b.type === 'tool_use');
  if (!toolUse?.input) return null;

  const input = toolUse.input as Partial<InvoiceExtractResult>;
  if (!input.customerName || !input.description || typeof input.amountNet !== 'number') return null;

  return {
    customerName: String(input.customerName).trim(),
    customerNif: input.customerNif ? String(input.customerNif).trim() : undefined,
    description: String(input.description).trim(),
    amountNet: input.amountNet,
    taxRate: typeof input.taxRate === 'number' ? input.taxRate : 0.21,
    issueDate:
      typeof input.issueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.issueDate)
        ? input.issueDate
        : today,
  };
}

async function createIsaakInvoiceDraft(input: {
  tenantId: string;
  userId: string;
  customerName: string;
  customerNif?: string;
  description: string;
  amountNet: number;
  taxRate: number;
  issueDate: string;
}) {
  const amountNet = Math.round(input.amountNet * 100) / 100;
  const amountTax = Math.round(amountNet * input.taxRate * 100) / 100;
  const amountGross = Math.round((amountNet + amountTax) * 100) / 100;

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { tenantId: input.tenantId } });
  const number = `FAC-${year}-${(count + 1).toString().padStart(4, '0')}`;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: input.tenantId,
      customerName: input.customerName,
      customerNif: input.customerNif ?? null,
      number,
      issueDate: new Date(input.issueDate),
      amountNet,
      amountTax,
      amountGross,
      status: 'draft',
      notes: input.description,
      createdBy: input.userId,
    },
  });

  return { invoice, amountNet, amountTax, amountGross, taxRate: input.taxRate };
}

async function issueIsaakInvoice(
  invoiceId: string,
  tenantId: string
): Promise<{
  ok: boolean;
  verifactuStatus?: string;
  verifactuHash?: string | null;
  error?: string;
}> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { tenant: { select: { nif: true, name: true, legalName: true } } },
  });

  if (!invoice) return { ok: false, error: 'Factura no encontrada' };
  if (invoice.verifactuStatus === 'validated' || invoice.verifactuStatus === 'accepted') {
    return {
      ok: true,
      verifactuStatus: invoice.verifactuStatus,
      verifactuHash: invoice.verifactuHash,
    };
  }

  const tenant = invoice.tenant as { nif?: string | null; name: string; legalName?: string | null };
  const tenantNif = tenant.nif ?? '';
  if (!tenantNif) {
    return {
      ok: false,
      error: 'Falta el NIF de la empresa. Configúralo en Ajustes antes de emitir.',
    };
  }

  const amountNet = Number(invoice.amountNet);
  const amountTax = Number(invoice.amountTax);
  const amountGross = Number(invoice.amountGross);

  const payload = {
    id: invoice.id,
    tenant_id: invoice.tenantId,
    tenant_nif: tenantNif,
    nif: tenantNif,
    number: invoice.number,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    amountNet,
    amountTax,
    amountGross,
    total: amountGross,
    tax: {
      rate: amountNet > 0 ? Number((amountTax / amountNet).toFixed(4)) : 0,
      amount: amountTax,
    },
    customer: { name: invoice.customerName, nif: invoice.customerNif ?? '' },
    issuer: { name: tenant.legalName || tenant.name, nif: tenantNif },
  };

  const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const verifactuBase = (
    process.env.VERIFACTU_API_URL ||
    process.env.API_BASE ||
    'https://api.verifactu.business'
  ).replace(/\/$/, '');

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      verifactuStatus: 'pending',
      verifactuPayloadHash: payloadHash,
      verifactuLastError: null,
    } as never,
  });

  const res = await fetch(`${verifactuBase}/api/verifactu/register-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    data?: Record<string, unknown>;
  };

  if (!res.ok || !body?.ok) {
    const errorMessage =
      (typeof body?.error === 'string' && body.error) || `VeriFactu API error ${res.status}`;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        verifactuStatus: 'error',
        verifactuLastError: errorMessage.slice(0, 1000),
      } as never,
    });
    return { ok: false, error: errorMessage };
  }

  const data = body?.data ?? {};
  const verifactuStatus =
    (typeof data?.verifactu_status === 'string' && data.verifactu_status) || 'validated';
  const verifactuHash = typeof data?.verifactu_hash === 'string' ? data.verifactu_hash : null;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      verifactuStatus,
      verifactuHash,
      verifactuQr: typeof data?.verifactu_qr === 'string' ? data.verifactu_qr : null,
      verifactuLastError: null,
    } as never,
  });

  return { ok: true, verifactuStatus, verifactuHash };
}

// ────────────────────────────────────────────────────────────────

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

  // ── Pending action detection ────────────────────────────────────
  let pendingIssueInvoiceId: string | null = null;
  let pendingExpense: Record<string, unknown> | null = null;
  let pendingExpenseHoldedKey: string | null = null;

  if (isIssueConfirmation(message) && conversation) {
    const lastMsg = await prisma.isaakConversationMsg
      .findFirst({
        where: { conversationId: conversation.id, role: 'assistant' },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => null);
    const meta = lastMsg?.metadata as Record<string, unknown> | null;
    pendingIssueInvoiceId =
      typeof meta?.pendingIssueInvoiceId === 'string' ? meta.pendingIssueInvoiceId : null;
    if (meta?.pendingExpense && typeof meta.pendingExpense === 'object') {
      pendingExpense = meta.pendingExpense as Record<string, unknown>;
      pendingExpenseHoldedKey = typeof meta.holdedApiKey === 'string' ? meta.holdedApiKey : null;
    }
  }

  let extraAssistantMetadata: Record<string, unknown> = {};
  let reply = '';
  let connectionProbe: Awaited<ReturnType<typeof probeHoldedConnection>> | null = null;
  let invoiceHandled = false;

  if (isInvoiceCreationIntent(message)) {
    const apiKey = process.env.ISAAK_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';
    if (apiKey) {
      const model =
        process.env.ISAAK_AI_MODEL_CLAUDE_DEFAULT ??
        process.env.ANTHROPIC_MODEL ??
        'claude-sonnet-4-5';
      const extracted = await callAnthropicForInvoiceData(
        message,
        context.labels.companyName || 'tu empresa',
        apiKey,
        model
      ).catch(() => null);

      if (extracted) {
        try {
          const { invoice, amountNet, amountTax, amountGross, taxRate } =
            await createIsaakInvoiceDraft({
              tenantId: session.tenantId,
              userId: session.userId,
              ...extracted,
            });
          const fmt = (n: number) =>
            n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
            ' €';
          reply = [
            `He creado el borrador de factura **${invoice.number}** para **${extracted.customerName}** 📄`,
            '',
            `- **Concepto:** ${extracted.description}`,
            `- **Base imponible:** ${fmt(amountNet)}`,
            `- **IVA (${Math.round(taxRate * 100)}%):** ${fmt(amountTax)}`,
            `- **Total:** ${fmt(amountGross)}`,
            extracted.customerNif ? `- **NIF cliente:** ${extracted.customerNif}` : '',
            '',
            '¿Quieres que la emita a la AEAT ahora mismo? Responde **"sí"** para confirmar.',
          ]
            .filter(Boolean)
            .join('\n');
          extraAssistantMetadata = { pendingIssueInvoiceId: invoice.id };
          invoiceHandled = true;
        } catch (err) {
          console.error('[holded/chat] invoice draft creation failed', err);
          reply =
            'He tenido un problema al crear el borrador. Inténtalo de nuevo o crea la factura directamente en Verifactu.';
          invoiceHandled = true;
        }
      }
    }
    if (!invoiceHandled) {
      reply =
        'No he podido extraer todos los datos necesarios. ¿Puedes indicar el nombre del cliente, el concepto y el importe neto en euros?';
      invoiceHandled = true;
    }
  } else if (pendingIssueInvoiceId) {
    const result = await issueIsaakInvoice(pendingIssueInvoiceId, session.tenantId).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : 'Error desconocido',
    }));
    if (result.ok) {
      reply = [
        '✅ Factura emitida correctamente a la AEAT.',
        '',
        result.verifactuHash ? `**Hash de registro:** \`${result.verifactuHash}\`` : '',
        '',
        'Puedes consultar el estado y el QR desde Verifactu.',
      ]
        .filter(Boolean)
        .join('\n');
    } else {
      reply = `No he podido emitir la factura: ${result.error ?? 'error desconocido'}. Puedes intentarlo desde Verifactu directamente.`;
    }
    invoiceHandled = true;
  } else if (pendingExpense) {
    // Register expense in Holded
    const holdedKey = pendingExpenseHoldedKey ?? context.holded.connection?.apiKey ?? '';
    if (!holdedKey) {
      reply =
        'No puedo registrar el gasto porque la conexión con Holded no está disponible. Revisa la configuración.';
    } else {
      const expenseDate =
        typeof pendingExpense.issueDate === 'string'
          ? Math.floor(new Date(pendingExpense.issueDate).getTime() / 1000)
          : Math.floor(Date.now() / 1000);
      const description =
        typeof pendingExpense.description === 'string'
          ? pendingExpense.description
          : 'Gasto registrado desde Isaak';
      const invoiceNumber =
        typeof pendingExpense.invoiceNumber === 'string' ? pendingExpense.invoiceNumber : null;
      const amountNet = typeof pendingExpense.amountNet === 'number' ? pendingExpense.amountNet : 0;
      const vatRate = typeof pendingExpense.vatRate === 'number' ? pendingExpense.vatRate : 0.21;
      const supplierName =
        typeof pendingExpense.supplierName === 'string' ? pendingExpense.supplierName : 'Proveedor';
      const amountTotal =
        typeof pendingExpense.amountTotal === 'number' ? pendingExpense.amountTotal : 0;

      const holdedPayload = {
        date: expenseDate,
        notes: invoiceNumber ? `${description} (Ref: ${invoiceNumber})` : description,
        products: [
          {
            desc: description,
            units: 1,
            price: amountNet,
            tax: Math.round(vatRate * 100),
          },
        ],
      };

      try {
        const holdedRes = await fetch(
          'https://api.holded.com/api/invoicing/v1/documents/purchase',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', key: holdedKey },
            body: JSON.stringify(holdedPayload),
          }
        );
        const holdedData = (await holdedRes.json().catch(() => ({}))) as {
          id?: string;
          status?: number;
          info?: string;
        };

        if (!holdedRes.ok || holdedData.status === 0) {
          reply = `No he podido registrar el gasto en Holded: ${holdedData.info ?? `Error ${holdedRes.status}`}. Puedes añadirlo manualmente en Holded.`;
        } else {
          const fmt = (n: number) =>
            n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
            ' €';
          reply = [
            `✅ Gasto registrado en Holded correctamente.`,
            '',
            `- **Proveedor:** ${supplierName}`,
            `- **Total:** ${fmt(amountTotal)}`,
            holdedData.id ? `- **ID Holded:** \`${holdedData.id}\`` : '',
            '',
            'Puedes verlo en la sección de Compras de Holded.',
          ]
            .filter(Boolean)
            .join('\n');
        }
      } catch (err) {
        console.error('[holded/chat] expense registration failed', err);
        reply =
          'Ha ocurrido un error al conectar con Holded. El gasto no se ha registrado. Inténtalo de nuevo o añádelo manualmente.';
      }
    }
    invoiceHandled = true;
  }

  if (!invoiceHandled) {
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
          ...extraAssistantMetadata,
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
