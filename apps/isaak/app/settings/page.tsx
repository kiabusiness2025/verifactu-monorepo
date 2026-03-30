import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildHoldedAuthUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';
import IsaakSettingsClient from './IsaakSettingsClient';

export const metadata: Metadata = {
  title: 'Settings | Isaak',
  description: 'Perfil, empresa, conexiones y personalizacion de Isaak.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IsaakSettingsPage({ searchParams }: PageProps) {
  const session = toSettingsSession(await getHoldedSession());
  const sectionParam = (await searchParams)?.section;
  const section = Array.isArray(sectionParam) ? sectionParam[0] : sectionParam;
  const settingsUrl = `${ISAAK_PUBLIC_URL}/settings${section ? `?section=${encodeURIComponent(section)}` : ''}`;

  if (!session) {
    redirect(buildHoldedAuthUrl('isaak_settings_requires_session', settingsUrl));
  }

  const settingsData = await loadSettingsData(session);

  return <IsaakSettingsClient initialSection={section || 'profile'} settingsData={settingsData} />;
}
