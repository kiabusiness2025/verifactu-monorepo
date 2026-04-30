import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { appendConversationMessage, ensureHoldedConversation } from '@/app/lib/holded-chat';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
type AllowedMime = (typeof ALLOWED_TYPES)[number];

export type ExtractedExpense = {
  supplierName: string;
  supplierNif?: string;
  issueDate: string;
  invoiceNumber?: string;
  description: string;
  amountNet: number;
  vatRate: number;
  amountTax: number;
  amountTotal: number;
  currency: string;
};

async function extractExpenseFromFile(
  fileBase64: string,
  mimeType: AllowedMime,
  apiKey: string,
  model: string
): Promise<ExtractedExpense | null> {
  const today = new Date().toISOString().slice(0, 10);
  const isPdf = mimeType === 'application/pdf';

  const fileBlock = isPdf
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
      }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: fileBase64 } };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system:
        'Eres un asistente de OCR y extracción de datos financieros para empresas españolas. Extrae toda la información financiera del documento con precisión.',
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: 'Extrae los datos de gasto/factura de este documento. Si algún campo no es legible, haz tu mejor estimación según el contexto.',
            },
          ],
        },
      ],
      tools: [
        {
          name: 'extract_expense',
          description: 'Extraer datos estructurados de gasto de una factura, ticket o recibo.',
          input_schema: {
            type: 'object',
            properties: {
              supplierName: { type: 'string', description: 'Nombre del proveedor o vendedor' },
              supplierNif: {
                type: 'string',
                description: 'NIF, CIF o número de IVA del proveedor',
              },
              issueDate: {
                type: 'string',
                description: `Fecha del documento en YYYY-MM-DD. Por defecto hoy: ${today}`,
              },
              invoiceNumber: {
                type: 'string',
                description: 'Número de factura o referencia del documento',
              },
              description: {
                type: 'string',
                description: 'Descripción principal de los bienes o servicios comprados',
              },
              amountNet: {
                type: 'number',
                description: 'Importe neto sin IVA en EUR',
              },
              vatRate: {
                type: 'number',
                description:
                  'Tipo de IVA como decimal: 0.21 para 21%, 0.10 para 10%, 0.04 para 4%, 0 para exento',
              },
              amountTax: { type: 'number', description: 'Importe total de IVA en EUR' },
              amountTotal: {
                type: 'number',
                description: 'Importe total incluyendo IVA en EUR',
              },
              currency: { type: 'string', description: 'Código de moneda (EUR, USD, etc.)' },
            },
            required: ['supplierName', 'description', 'amountTotal'],
          },
        },
      ],
      tool_choice: { type: 'auto' },
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { content?: Array<{ type: string; input?: unknown }> };
  const toolUse = data.content?.find((b) => b.type === 'tool_use');
  if (!toolUse?.input) return null;

  const input = toolUse.input as Partial<ExtractedExpense>;
  if (!input.supplierName || !input.description || typeof input.amountTotal !== 'number')
    return null;

  const amountTotal = input.amountTotal;
  const vatRate = typeof input.vatRate === 'number' ? input.vatRate : 0.21;
  const amountNet =
    typeof input.amountNet === 'number'
      ? input.amountNet
      : Math.round((amountTotal / (1 + vatRate)) * 100) / 100;
  const amountTax =
    typeof input.amountTax === 'number'
      ? input.amountTax
      : Math.round((amountTotal - amountNet) * 100) / 100;

  return {
    supplierName: String(input.supplierName).trim(),
    supplierNif: input.supplierNif ? String(input.supplierNif).trim() : undefined,
    issueDate:
      typeof input.issueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.issueDate)
        ? input.issueDate
        : today,
    invoiceNumber: input.invoiceNumber ? String(input.invoiceNumber).trim() : undefined,
    description: String(input.description).trim(),
    amountNet,
    vatRate,
    amountTax,
    amountTotal,
    currency: typeof input.currency === 'string' ? input.currency.toUpperCase() : 'EUR',
  };
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Datos de formulario inválidos.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const conversationId = (formData.get('conversationId') as string | null) ?? null;

  if (!file) {
    return NextResponse.json({ error: 'No se ha enviado ningún archivo.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 5 MB.' }, { status: 413 });
  }

  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no soportado. Envía PDF, JPG, PNG o WebP.' },
      { status: 415 }
    );
  }

  const apiKey = process.env.ISAAK_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    return NextResponse.json({ error: 'Configuración de IA no disponible.' }, { status: 503 });
  }

  const model =
    process.env.ISAAK_AI_MODEL_CLAUDE_DEFAULT ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';

  const ctx = await loadIsaakBusinessContext(
    {
      tenantId: session.tenantId,
      userId: session.userId,
      name: session.name,
      email: session.email,
    },
    { includeSnapshot: false }
  ).catch(() => null);

  if (!ctx?.holded.connection?.apiKey) {
    return NextResponse.json(
      { error: 'Conecta tu cuenta de Holded antes de subir documentos.' },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = Buffer.from(arrayBuffer).toString('base64');

  const extracted = await extractExpenseFromFile(
    fileBase64,
    file.type as AllowedMime,
    apiKey,
    model
  ).catch(() => null);

  if (!extracted) {
    const reply =
      'No he podido leer los datos del documento. Asegúrate de que sea una factura o ticket legible (PDF o imagen clara).';
    return NextResponse.json({ ok: false, reply });
  }

  let conversation = null;
  try {
    conversation = await ensureHoldedConversation(
      { tenantId: session.tenantId, userId: session.userId },
      {
        conversationId: conversationId || null,
        titleSeed: `Gasto: ${extracted.supplierName}`,
      }
    );
    await appendConversationMessage({
      conversationId: conversation.id,
      role: 'user',
      content: `[Documento subido: ${file.name}]`,
    });
  } catch {
    /* non-fatal */
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const reply = [
    `He leído el documento y he encontrado los siguientes datos de gasto 📄`,
    '',
    `- **Proveedor:** ${extracted.supplierName}${extracted.supplierNif ? ` (${extracted.supplierNif})` : ''}`,
    extracted.invoiceNumber ? `- **Nº factura:** ${extracted.invoiceNumber}` : '',
    `- **Fecha:** ${extracted.issueDate}`,
    `- **Concepto:** ${extracted.description}`,
    `- **Base imponible:** ${fmt(extracted.amountNet)}`,
    `- **IVA (${Math.round(extracted.vatRate * 100)}%):** ${fmt(extracted.amountTax)}`,
    `- **Total:** ${fmt(extracted.amountTotal)}`,
    '',
    '¿Quieres que lo registre como gasto en Holded? Responde **"sí"** para confirmar.',
  ]
    .filter(Boolean)
    .join('\n');

  let assistantMsg = null;
  if (conversation) {
    try {
      assistantMsg = await appendConversationMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: reply,
        metadata: {
          source: 'isaak_expense_upload',
          pendingExpense: extracted,
          holdedApiKey: ctx.holded.connection.apiKey,
        },
      });
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({
    ok: true,
    reply,
    assistantMessage: assistantMsg,
    conversation: conversation ? { id: conversation.id, title: conversation.title } : null,
  });
}
