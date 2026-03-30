import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildHoldedProfileOnboardingUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import { toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function POST() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    redirectUrl: buildHoldedProfileOnboardingUrl(
      'isaak_settings_repersonalize',
      `${ISAAK_PUBLIC_URL}/chat?source=isaak_settings`
    ),
  });
}
