import { buildAuthUrl, buildConnectorConnectUrl } from '@/app/lib/holded-navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import OnboardingHoldedClient from './OnboardingHoldedClient';
import { resolveHoldedCompletionTarget } from './completionTarget';

export const metadata: Metadata = {
  title: 'Conectar Holded | Holded',
  description:
    'Conecta tu cuenta de Holded mediante un flujo guiado con validacion de API key, deteccion de empresa y conexion inmediata.',
};

type InitialIdentity = {
  companyName: string;
  legalName: string;
  taxId: string;
  contactFirstName: string;
  contactLastName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function readChannel(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] || '' : value || '';
  return resolved === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function readBooleanFlag(value: string | string[] | undefined) {
  const resolved = readSource(value).trim().toLowerCase();
  return resolved === '1' || resolved === 'true' || resolved === 'yes';
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || '';
}

function isPlaceholderCompany(value: string) {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized.endsWith('- holded') || normalized === 'tu empresa';
}

function splitFullName(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
}

async function readInitialIdentity(
  tenantId: string,
  userId?: string | null,
  sessionName?: string | null,
  sessionEmail?: string | null
) {
  try {
    const [tenant, user] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          legalName: true,
          nif: true,
          profile: {
            select: {
              tradeName: true,
              legalName: true,
              taxId: true,
              representative: true,
              representativeRole: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const userFullName = normalizeText(user?.name);
    const userNameFromParts = normalizeText(
      [normalizeText(user?.firstName), normalizeText(user?.lastName)].filter(Boolean).join(' ')
    );
    const fallbackSessionName = userFullName || userNameFromParts || normalizeText(sessionName);

    const representative = fallbackSessionName || normalizeText(tenant?.profile?.representative);
    const contactName = splitFullName(representative);
    // Only pre-fill from TenantProfile — never fall back to tenant.name/legalName/nif.
    // TenantProfile is deleted on disconnect, so these return '' after a fresh disconnect.
    const companyNameCandidate = normalizeText(tenant?.profile?.tradeName);
    const legalNameCandidate = normalizeText(tenant?.profile?.legalName);

    return {
      companyName: isPlaceholderCompany(companyNameCandidate) ? '' : companyNameCandidate,
      legalName: isPlaceholderCompany(legalNameCandidate) ? '' : legalNameCandidate,
      taxId: normalizeText(tenant?.profile?.taxId),
      contactFirstName: contactName.firstName,
      contactLastName: contactName.lastName,
      contactRole: normalizeText(tenant?.profile?.representativeRole),
      contactEmail: normalizeText(tenant?.profile?.email) || normalizeText(sessionEmail),
      contactPhone: normalizeText(tenant?.profile?.phone),
    } satisfies InitialIdentity;
  } catch (error) {
    console.error('[holded onboarding connect] failed to read initial identity', error);
    const contactName = splitFullName(sessionName);
    return {
      companyName: '',
      legalName: '',
      taxId: '',
      contactFirstName: contactName.firstName,
      contactLastName: contactName.lastName,
      contactRole: '',
      contactEmail: normalizeText(sessionEmail),
      contactPhone: '',
    } satisfies InitialIdentity;
  }
}

export default async function HoldedOnboardingConnectionPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_onboarding_connect';
  const channel = readChannel(resolved.channel);
  const forceFullReset = readBooleanFlag(resolved.reset) || readBooleanFlag(resolved.fresh);
  const next = readSource(resolved.next);
  const onboardingToken = readSource(resolved.onboarding_token);
  const session = await getHoldedSession();
  const nextTarget = resolveHoldedCompletionTarget(next || undefined);

  if (!session?.tenantId) {
    redirect(
      buildAuthUrl(
        source,
        buildConnectorConnectUrl({
          source,
          channel,
          next,
          onboardingToken,
        })
      )
    );
  }

  const initialIdentity = await readInitialIdentity(
    session.tenantId,
    session.userId,
    session.name || null,
    session.email || null
  );

  return (
    <OnboardingHoldedClient
      channel={channel}
      nextTarget={nextTarget}
      initialIdentity={initialIdentity}
      forceFullReset={forceFullReset}
    />
  );
}
