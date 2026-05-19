import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { refreshGoogleTokenIfNeeded } from '@/app/lib/gmail-scan-service';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { appendConversationMessage, ensureHoldedConversation } from '@/app/lib/holded-chat';
import { uploadFileToDrive } from '@/app/lib/google-drive';

export const runtime = 'nodejs';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
]);

type GmailPart = {
  partId: string;
  mimeType: string;
  filename?: string;
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
};

function findAttachmentPart(parts: GmailPart[]): GmailPart | null {
  for (const part of parts) {
    if (part.body?.attachmentId && part.filename && ALLOWED_MIMES.has(part.mimeType)) {
      return part;
    }
    if (part.parts) {
      const found = findAttachmentPart(part.parts);
      if (found) return found;
    }
  }
  return null;
}

async function extractExpenseFromFile(
  fileBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
) {
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
            { type: 'text', text: 'Extrae los datos de gasto/factura de este documento.' },
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
              supplierName: { type: 'string' },
              supplierNif: { type: 'string' },
              issueDate: { type: 'string', description: `YYYY-MM-DD, por defecto ${today}` },
              invoiceNumber: { type: 'string' },
              description: { type: 'string' },
              amountNet: { type: 'number' },
              vatRate: { type: 'number' },
              amountTax: { type: 'number' },
              amountTotal: { type: 'number' },
              currency: { type: 'string' },
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

  const input = toolUse.input as Record<string, unknown>;
  if (!input.supplierName || !input.description || typeof input.amountTotal !== 'number')
    return null;

  const amountTotal = input.amountTotal as number;
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

  const body = (await request.json().catch(() => null)) as {
    messageId?: string;
    conversationId?: string;
  } | null;
  if (!body?.messageId) {
    return NextResponse.json({ error: 'messageId requerido.' }, { status: 400 });
  }

  const accessToken = await refreshGoogleTokenIfNeeded(session.tenantId, session.userId);
  if (!accessToken) {
    return NextResponse.json({ error: 'Google no conectado o token expirado.' }, { status: 400 });
  }

  // Fetch full message to get attachment part IDs
  const msgRes = await fetch(`${GMAIL_API}/users/me/messages/${body.messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!msgRes.ok) {
    return NextResponse.json({ error: 'No se pudo obtener el email de Gmail.' }, { status: 502 });
  }

  const msg = (await msgRes.json()) as {
    id: string;
    payload?: {
      parts?: GmailPart[];
      mimeType?: string;
      filename?: string;
      body?: { attachmentId?: string };
    };
  };
  const parts = msg.payload?.parts ?? [];

  // Find first processable attachment
  const attachmentPart = findAttachmentPart(parts);
  if (!attachmentPart?.body?.attachmentId) {
    return NextResponse.json(
      { error: 'No se encontró un adjunto PDF o imagen en este email.' },
      { status: 422 }
    );
  }

  // Download attachment bytes
  const attRes = await fetch(
    `${GMAIL_API}/users/me/messages/${body.messageId}/attachments/${attachmentPart.body.attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!attRes.ok) {
    return NextResponse.json({ error: 'Error al descargar el adjunto.' }, { status: 502 });
  }

  const attData = (await attRes.json()) as { data?: string };
  if (!attData.data) {
    return NextResponse.json({ error: 'El adjunto está vacío.' }, { status: 422 });
  }

  // Gmail returns URL-safe base64; convert to standard base64
  const base64Standard = attData.data.replace(/-/g, '+').replace(/_/g, '/');
  const fileBuffer = Buffer.from(base64Standard, 'base64');

  if (fileBuffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'El adjunto supera el límite de 5 MB.' }, { status: 413 });
  }

  const apiKey = process.env.ISAAK_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    return NextResponse.json({ error: 'Configuración de IA no disponible.' }, { status: 503 });
  }

  const model = process.env.ISAAK_AI_MODEL_CLAUDE_DEFAULT ?? 'claude-sonnet-4-6';

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
      { error: 'Conecta tu cuenta de Holded antes de procesar documentos.' },
      { status: 400 }
    );
  }

  const extracted = await extractExpenseFromFile(
    base64Standard,
    attachmentPart.mimeType,
    apiKey,
    model
  ).catch(() => null);

  if (!extracted) {
    return NextResponse.json({
      ok: false,
      reply:
        'No he podido leer los datos del adjunto. Asegúrate de que sea una factura o ticket legible.',
    });
  }

  // Fire-and-forget: backup to Drive
  const fileName = attachmentPart.filename ?? `factura-gmail-${Date.now()}.pdf`;
  void uploadFileToDrive(
    session.tenantId,
    session.userId,
    fileName,
    fileBuffer,
    attachmentPart.mimeType
  ).catch(() => null);

  let conversation = null;
  try {
    conversation = await ensureHoldedConversation(
      { tenantId: session.tenantId, userId: session.userId },
      { conversationId: body.conversationId ?? null, titleSeed: `Gasto: ${extracted.supplierName}` }
    );
    await appendConversationMessage({
      conversationId: conversation.id,
      role: 'user',
      content: `[Email Gmail: ${fileName}]`,
    });
  } catch {
    /* non-fatal */
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const reply = [
    `He leído el adjunto del email y he encontrado los siguientes datos de gasto 📧`,
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
          source: 'isaak_gmail_expense',
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
