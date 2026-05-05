/**
 * POST /api/isaak/banking/mandate-setup
 *
 * Inicia el flujo de autorización de mandato SEPA.
 * Devuelve una URL de GoCardless donde el cliente aprueba el mandato.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { createMandateSetupLink } from '@verifactu/integrations/gocardless-payments';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    given_name?: string;
    family_name?: string;
    company_name?: string;
  } | null;

  if (!body?.email) {
    return NextResponse.json({ error: 'Se requiere email.' }, { status: 400 });
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const redirect_uri = `${origin}/settings?section=banking&gc_callback=1`;

  try {
    const result = await createMandateSetupLink({
      customer_email: body.email,
      given_name: body.given_name,
      family_name: body.family_name,
      company_name: body.company_name,
      redirect_uri,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
