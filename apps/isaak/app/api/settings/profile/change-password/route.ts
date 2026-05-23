import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildIsaakAuthUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import { toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function POST() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: false,
      available: false,
      error:
        'El cambio de contraseña se realiza desde la página de acceso. Usa el enlace de recuperación.',
      redirectUrl: buildIsaakAuthUrl(
        'isaak_settings_change_password',
        `${ISAAK_PUBLIC_URL}/settings?section=profile`
      ),
    },
    { status: 409 }
  );
}
