import { NextResponse } from 'next/server';
import { disconnectHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';
import { sendHoldedDisconnectNotifications } from '@/app/lib/communications/holded-disconnect-emails';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirmDisconnect !== true) {
    return NextResponse.json({ error: 'Confirma la desconexion para continuar.' }, { status: 400 });
  }

  if (body.confirmationPhrase !== 'DESCONECTAR') {
    return NextResponse.json(
      { error: 'Escribe DESCONECTAR para confirmar la desconexion.' },
      { status: 400 }
    );
  }

  const previousSettings = await loadSettingsData(session);

  await disconnectHoldedConnection({
    tenantId: session.tenantId,
    userId: session.userId,
  });

  void sendHoldedDisconnectNotifications({
    userEmail: session.email ?? null,
    userName: session.name ?? previousSettings.profile.firstName ?? null,
    companyName:
      previousSettings.connection.tenantName ||
      previousSettings.company.tradeName ||
      previousSettings.company.legalName ||
      null,
    disconnectedAtIso: new Date().toISOString(),
  }).catch((error) => {
    console.error('[isaak settings] holded disconnect notifications failed', error);
  });

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.connection });
}
