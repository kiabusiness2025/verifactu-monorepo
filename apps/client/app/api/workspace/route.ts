import { NextResponse } from 'next/server';
import { getSessionPayload } from '../../../lib/session';
import { getWorkspaceStateFromSession } from '../../../src/server/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: true, authenticated: false });
  }

  try {
    const workspace = await getWorkspaceStateFromSession(session);
    return NextResponse.json({ ok: true, authenticated: true, ...workspace });
  } catch (error) {
    console.error('[client/workspace] GET error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar el workspace del cliente' },
      { status: 500 }
    );
  }
}
