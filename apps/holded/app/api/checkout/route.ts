import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Checkout desactivado en la release gratuita de Holded.',
    },
    { status: 410 }
  );
}
