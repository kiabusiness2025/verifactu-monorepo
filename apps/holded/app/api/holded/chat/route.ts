import { NextRequest, NextResponse } from 'next/server';
import { fetchHoldedSnapshot, getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

function buildReply(message: string, snapshot: Awaited<ReturnType<typeof fetchHoldedSnapshot>>) {
  const text = message.toLowerCase();
  const invoiceCount = snapshot.invoices.length;
  const contactCount = snapshot.contacts.length;
  const accountCount = snapshot.accounts.length;

  if (text.includes('factura') || text.includes('venta') || text.includes('cobro')) {
    return `Ya tengo acceso a tu entorno de Holded. He podido ver ${invoiceCount} facturas recientes en la muestra inicial. Si quieres, el siguiente paso es pedirme un resumen simple de ventas o cobros pendientes.`;
  }

  if (text.includes('cliente') || text.includes('contacto')) {
    return `La conexión está activa. En la primera lectura he encontrado ${contactCount} contactos en la muestra rápida. Ya podemos usar este dashboard para revisar clientes y actividad sin salir de Holded.`;
  }

  if (text.includes('cuenta') || text.includes('contabilidad') || text.includes('gasto')) {
    return `Con la conexión actual he podido validar ${accountCount} cuentas contables en la muestra básica. A partir de aquí podemos convertir esos datos en respuestas más claras para negocio.`;
  }

  return `La conexión con Holded está activa y el dashboard ya puede trabajar sobre una primera muestra de ${invoiceCount} facturas, ${contactCount} contactos y ${accountCount} cuentas. Pregúntame por ventas, cobros, gastos o clientes y empezamos.`;
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
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

  if (!message) {
    return NextResponse.json({ error: 'Escribe una pregunta para continuar.' }, { status: 400 });
  }

  const snapshot = await fetchHoldedSnapshot(connection.apiKey);
  const reply = buildReply(message, snapshot);

  return NextResponse.json({
    ok: true,
    reply,
    snapshot: {
      invoices: snapshot.invoices.length,
      contacts: snapshot.contacts.length,
      accounts: snapshot.accounts.length,
    },
  });
}
