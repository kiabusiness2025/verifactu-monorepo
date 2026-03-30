import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function GET() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await loadSettingsData(session);
  return NextResponse.json({
    ok: true,
    data: {
      holded: settings.connection,
      upcoming: [
        { provider: 'google_drive', label: 'Google Drive', status: 'coming_soon' },
        { provider: 'gmail', label: 'Gmail', status: 'coming_soon' },
        { provider: 'calendar', label: 'Calendar', status: 'coming_soon' },
      ],
    },
  });
}
