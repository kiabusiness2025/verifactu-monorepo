import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { buildAuthUrl, buildConnectorConnectUrl } from '@/app/lib/holded-navigation';
import OnboardingHoldedClient from './OnboardingHoldedClient';
import { resolveHoldedCompletionTarget } from './completionTarget';

export const metadata: Metadata = {
  title: 'Conectar Holded | Verifactu',
  description:
    'Introduce los datos base de empresa y contacto junto con tu API key de Holded para activar el conector directo.',
};

type InitialIdentity = {
  companyName: string;
  legalName: string;
  taxId: string;
  contactFirstName: string;
  contactLastName: string;
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
  sessionName?: string | null,
  sessionEmail?: string | null
) {
  try {
    const tenant = await prisma.tenant.findUnique({
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
            email: true,
            phone: true,
          },
        },
      },
    });

    const representative =
      normalizeText(tenant?.profile?.representative) || normalizeText(sessionName);
    const contactName = splitFullName(representative);
    const companyNameCandidate =
      normalizeText(tenant?.profile?.tradeName) || normalizeText(tenant?.name);
    const legalNameCandidate =
      normalizeText(tenant?.profile?.legalName) || normalizeText(tenant?.legalName);

    return {
      companyName: isPlaceholderCompany(companyNameCandidate) ? '' : companyNameCandidate,
      legalName: isPlaceholderCompany(legalNameCandidate) ? '' : legalNameCandidate,
      taxId: normalizeText(tenant?.profile?.taxId) || normalizeText(tenant?.nif),
      contactFirstName: contactName.firstName,
      contactLastName: contactName.lastName,
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
      contactEmail: normalizeText(sessionEmail),
      contactPhone: '',
    } satisfies InitialIdentity;
  }
}

export default async function HoldedOnboardingConnectionPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_onboarding_connect';
  const channel = readChannel(resolved.channel);
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
    session.name || null,
    session.email || null
  );

  return (
    <OnboardingHoldedClient
      channel={channel}
      nextTarget={nextTarget}
      initialIdentity={initialIdentity}
    />
  );
}
