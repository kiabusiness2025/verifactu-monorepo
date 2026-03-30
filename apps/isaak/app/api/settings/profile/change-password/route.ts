import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildHoldedAuthUrl } from '@/app/lib/isaak-navigation';
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
        'El cambio directo de contrasena sigue en fase 2. Usa el flujo de acceso de Holded para restablecerla.',
      redirectUrl: buildHoldedAuthUrl(
        'isaak_settings_change_password',
        'https://isaak.verifactu.business/settings?section=profile'
      ),
    },
    { status: 409 }
  );
}
