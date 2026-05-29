import { NextResponse } from 'next/server';

// Endpoint diagnóstico TEMPORAL — verificar si NEXT_PUBLIC_ISAAK_V1_LAUNCH
// llega al runtime. Eliminar tras verificar.

export const runtime = 'nodejs';

export async function GET() {
  const raw = process.env.NEXT_PUBLIC_ISAAK_V1_LAUNCH;
  const allPublic = Object.fromEntries(
    Object.entries(process.env)
      .filter(([k]) => k.startsWith('NEXT_PUBLIC_'))
      .map(([k, v]) => [k, v ? `${v.slice(0, 30)}${v.length > 30 ? '…' : ''}` : null])
  );
  return NextResponse.json({
    NEXT_PUBLIC_ISAAK_V1_LAUNCH_raw: raw ?? null,
    NEXT_PUBLIC_ISAAK_V1_LAUNCH_isTrue: raw === 'true',
    all_NEXT_PUBLIC: allPublic,
    timestamp: new Date().toISOString(),
  });
}
