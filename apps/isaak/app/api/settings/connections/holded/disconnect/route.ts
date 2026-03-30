import { NextResponse } from 'next/server';
import { disconnectHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function POST() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await disconnectHoldedConnection({
    tenantId: session.tenantId,
    userId: session.userId,
  });

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.connection });
}
