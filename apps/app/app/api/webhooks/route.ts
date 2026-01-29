// Handler para eventos entrantes de servicios externos (ej: Stripe, Resend, Banca)
export async function POST(request: Request) {
  // Aquí se procesará el evento recibido
  return new Response('Evento recibido', { status: 200 });
}
