import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getPublicClaimDetails } from '@/app/lib/holded-governance';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para revisar esta reclamacion.' },
      { status: 401 }
    );
  }

  const params = await context.params;

  try {
    const details = await getPublicClaimDetails({
      requesterUserId: session.userId,
      tenantId: session.tenantId,
      claimId: params.id,
    });

    return NextResponse.json(details);
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'claim_not_found'
        ? 'No se ha encontrado la reclamacion.'
        : error instanceof Error
          ? error.message
          : 'No se pudo cargar la reclamacion.';

    return NextResponse.json({ error: message }, { status: 404 });
  }
}
