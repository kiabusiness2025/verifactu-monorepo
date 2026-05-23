import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { holdedSendDocument } from '@/app/lib/holded-api';

export const runtime = 'nodejs';

const VALID_DOC_TYPES = new Set([
  'invoice',
  'salesreceipt',
  'creditnote',
  'purchase',
  'purchaseorder',
  'estimate',
  'proforma',
]);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  const { docType, documentId, emails, subject, body: emailBody, cc } = body as Record<
    string,
    unknown
  >;

  if (typeof docType !== 'string' || !VALID_DOC_TYPES.has(docType)) {
    return NextResponse.json(
      {
        error: `docType no válido. Valores permitidos: ${[...VALID_DOC_TYPES].join(', ')}.`,
      },
      { status: 400 }
    );
  }

  if (typeof documentId !== 'string' || !documentId.trim()) {
    return NextResponse.json({ error: 'documentId es obligatorio.' }, { status: 400 });
  }

  const emailList = Array.isArray(emails)
    ? (emails as unknown[]).filter((e): e is string => typeof e === 'string' && isValidEmail(e))
    : [];

  if (emailList.length === 0) {
    return NextResponse.json(
      { error: 'Debes indicar al menos un email destinatario válido.' },
      { status: 400 }
    );
  }

  const connection = await getHoldedConnection(session.tenantId, 'dashboard').catch(() => null);
  if (!connection?.apiKey || connection.status === 'disconnected') {
    return NextResponse.json(
      { error: 'Conecta tu cuenta de Holded antes de enviar documentos.' },
      { status: 400 }
    );
  }

  try {
    const result = await holdedSendDocument(connection.apiKey, docType, documentId.trim(), {
      emails: emailList,
      subject: typeof subject === 'string' ? subject : undefined,
      body: typeof emailBody === 'string' ? emailBody : undefined,
      cc: Array.isArray(cc)
        ? (cc as unknown[]).filter((e): e is string => typeof e === 'string' && isValidEmail(e))
        : undefined,
    });

    const fmt = emailList.length === 1 ? `a ${emailList[0]}` : `a ${emailList.length} destinatarios`;
    return NextResponse.json({
      ok: result.ok,
      reply: `Documento enviado correctamente ${fmt}.`,
      raw: result.raw,
    });
  } catch (err) {
    console.error('[holded/actions/send-document] failed', {
      tenantId: session.tenantId,
      docType,
      documentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error al enviar el documento.',
      },
      { status: 502 }
    );
  }
}
