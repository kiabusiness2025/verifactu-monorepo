import { prisma } from '@/app/lib/prisma';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { getIsaakOnboardingState } from '@verifactu/integrations';
import { stripeClient } from '@verifactu/integrations';
import { ISAAK_PUBLIC_URL, buildHoldedProfileOnboardingUrl } from './isaak-navigation';

export type SettingsProfileData = {
  photoUrl: string | null;
  firstName: string;
  email: string;
  phone: string | null;
  roleInCompany: string | null;
};

export type SettingsCompanyData = {
  tradeName: string;
  legalName: string;
  activityMain: string;
  sector: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  taxId: string;
  representative: string;
  website: string;
  phone: string;
  teamSize: string;
};

export type SettingsConnectionData = {
  status: string;
  tenantName: string | null;
  keyMasked: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  validationSummary: string | null;
  supportedModules: string[];
};

export type SettingsIsaakData = {
  preferredName: string;
  communicationStyle: string;
  likelyKnowledgeLevel: string;
  mainGoals: string[];
  resetUrl: string;
};

export type SettingsBillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number | null;
  amountPaid: number | null;
  currency: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  createdAt: string | null;
};

export type SettingsBillingData = {
  name: string;
  code: string;
  status: string;
  stripeStatus: string | null;
  nextRenewalAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethodSummary: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  portalAvailable: boolean;
  checkoutAvailable: boolean;
  cancelAvailable: boolean;
  invoices: SettingsBillingInvoice[];
};

export type SettingsTeamData = {
  enabled: boolean;
  activeMembers: number;
};

export type SettingsData = {
  profile: SettingsProfileData;
  company: SettingsCompanyData;
  connection: SettingsConnectionData;
  isaak: SettingsIsaakData;
  billing: SettingsBillingData;
  team: SettingsTeamData;
};

export type SettingsSession = {
  tenantId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
};

export function toSettingsSession(
  input: {
    tenantId?: string | null;
    userId?: string | null;
    email?: string | null;
    name?: string | null;
  } | null
): SettingsSession | null {
  if (!input?.tenantId || !input.userId) {
    return null;
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    email: input.email ?? null,
    name: input.name ?? null,
  };
}

function takeFirstName(value: string | null | undefined) {
  const normalized = (value || '').trim();
  if (!normalized) return '';
  return normalized.split(' ')[0]?.trim() || normalized;
}

export function employeesToLabel(value: number | null | undefined) {
  if (!value || value <= 1) return 'Solo yo';
  if (value <= 5) return '2-5 personas';
  if (value <= 20) return '6-20 personas';
  return 'Mas de 20';
}

export function parseEmployeesLabel(teamSize: string | null) {
  switch (teamSize) {
    case 'Solo yo':
      return 1;
    case '2-5 personas':
      return 5;
    case '6-20 personas':
      return 20;
    case 'Mas de 20':
      return 21;
    default:
      return null;
  }
}

function normalizeAmount(amount: number | null | undefined) {
  if (typeof amount !== 'number') return null;
  return amount / 100;
}

function formatCardBrand(brand: string | null | undefined) {
  if (!brand) return null;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function readDefaultPriceId() {
  return (
    process.env.STRIPE_PRICE_HOLDED_FISCAL_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_HOLDED_MIGRACIONES_MONTHLY?.trim() ||
    ''
  );
}

export function getSettingsReturnUrl(section: string) {
  return `${ISAAK_PUBLIC_URL}/settings?section=${encodeURIComponent(section)}`;
}

export async function loadBillingData(input: {
  tenantId: string;
  includeInvoices?: boolean;
}): Promise<SettingsBillingData> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: input.tenantId },
    include: { plan: true },
    orderBy: [{ createdAt: 'desc' }],
  });

  const customerId = subscription?.stripeCustomerId ?? null;
  const subscriptionId = subscription?.stripeSubscriptionId ?? null;
  const billing: SettingsBillingData = {
    name: subscription?.plan?.name ?? 'Plan gratuito',
    code: subscription?.plan?.code ?? 'free',
    status: subscription?.status ?? 'active',
    stripeStatus: subscription?.stripeStatus ?? null,
    nextRenewalAt: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    paymentMethodSummary: null,
    customerId,
    subscriptionId,
    portalAvailable: Boolean(process.env.STRIPE_SECRET_KEY && customerId),
    checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && readDefaultPriceId()),
    cancelAvailable: Boolean(process.env.STRIPE_SECRET_KEY && subscriptionId),
    invoices: [],
  };

  if (!process.env.STRIPE_SECRET_KEY || !customerId) {
    return billing;
  }

  try {
    const subscriptions = await stripeClient.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 5,
      expand: ['data.default_payment_method'],
    });

    const activeSubscription =
      subscriptions.data.find((item) => item.id === subscriptionId) ||
      subscriptions.data.find((item) => ['active', 'trialing', 'past_due'].includes(item.status)) ||
      subscriptions.data[0];

    const paymentMethod = activeSubscription?.default_payment_method;
    if (paymentMethod && typeof paymentMethod !== 'string' && paymentMethod.type === 'card') {
      const card = paymentMethod.card;
      billing.paymentMethodSummary = card
        ? `${formatCardBrand(card.brand)} terminada en ${card.last4}`
        : null;
    }

    if (input.includeInvoices) {
      const invoices = await stripeClient.invoices.list({
        customer: customerId,
        limit: 10,
      });

      billing.invoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number ?? null,
        status: invoice.status ?? null,
        amountDue: normalizeAmount(invoice.amount_due ?? null),
        amountPaid: normalizeAmount(invoice.amount_paid ?? null),
        currency: invoice.currency ?? null,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        invoicePdf: invoice.invoice_pdf ?? null,
        createdAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      }));
    }
  } catch (error) {
    console.warn('[isaak settings] failed to load Stripe billing data', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return billing;
}

export async function loadSettingsData(session: SettingsSession): Promise<SettingsData> {
  const [user, tenantProfile, connection, onboardingState, billing, activeMembers] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, image: true, phone: true },
      }),
      prisma.tenantProfile.findUnique({
        where: { tenantId: session.tenantId },
        select: {
          tradeName: true,
          legalName: true,
          cnaeText: true,
          cnae: true,
          address: true,
          postalCode: true,
          city: true,
          province: true,
          country: true,
          taxId: true,
          representative: true,
          website: true,
          phone: true,
          employees: true,
        },
      }),
      getHoldedConnection(session.tenantId, 'dashboard'),
      getIsaakOnboardingState({
        prisma,
        tenantId: session.tenantId,
        userId: session.userId,
      }),
      loadBillingData({
        tenantId: session.tenantId,
        includeInvoices: false,
      }),
      prisma.membership.count({
        where: {
          tenantId: session.tenantId,
          status: 'active',
        },
      }),
    ]);

  const onboarding = onboardingState.profile;
  const instructions = onboardingState.instructions;

  return {
    profile: {
      photoUrl: user?.image ?? null,
      firstName:
        takeFirstName(user?.name) ||
        takeFirstName(onboarding?.preferredName) ||
        takeFirstName(tenantProfile?.representative) ||
        '',
      email: user?.email ?? session.email ?? '',
      phone: user?.phone ?? null,
      roleInCompany: onboarding?.roleInCompanyOther || onboarding?.roleInCompany || null,
    },
    company: {
      tradeName: tenantProfile?.tradeName ?? connection?.tenantName ?? '',
      legalName: tenantProfile?.legalName ?? connection?.legalName ?? '',
      activityMain: tenantProfile?.cnaeText ?? onboarding?.businessSector ?? '',
      sector: tenantProfile?.cnae ?? '',
      address: tenantProfile?.address ?? '',
      postalCode: tenantProfile?.postalCode ?? '',
      city: tenantProfile?.city ?? '',
      province: tenantProfile?.province ?? '',
      country: tenantProfile?.country ?? 'ES',
      taxId: tenantProfile?.taxId ?? connection?.taxId ?? '',
      representative: tenantProfile?.representative ?? user?.name ?? '',
      website: tenantProfile?.website ?? onboarding?.website ?? '',
      phone: tenantProfile?.phone ?? '',
      teamSize: onboarding?.teamSize || employeesToLabel(tenantProfile?.employees),
    },
    connection: {
      status: connection?.status ?? 'disconnected',
      tenantName:
        tenantProfile?.tradeName ?? tenantProfile?.legalName ?? connection?.tenantName ?? null,
      keyMasked: connection?.keyMasked ?? null,
      connectedAt: connection?.connectedAt ?? null,
      lastValidatedAt: connection?.lastValidatedAt ?? null,
      validationSummary: connection?.validationSummary ?? null,
      supportedModules: connection?.supportedModules ?? [],
    },
    isaak: {
      preferredName: onboarding?.preferredName || takeFirstName(user?.name) || '',
      communicationStyle:
        instructions?.communicationStyle ||
        onboarding?.communicationStyle ||
        'spanish_clear_non_technical',
      likelyKnowledgeLevel:
        instructions?.likelyKnowledgeLevel || onboarding?.likelyKnowledgeLevel || 'starter',
      mainGoals: onboarding?.mainGoals ?? [],
      resetUrl: buildHoldedProfileOnboardingUrl(
        'isaak_settings_repersonalize',
        `${ISAAK_PUBLIC_URL}/chat?source=isaak_settings`
      ),
    },
    billing,
    team: {
      enabled: false,
      activeMembers,
    },
  };
}

export async function loadBillingInvoices(tenantId: string) {
  const billing = await loadBillingData({ tenantId, includeInvoices: true });
  return billing.invoices;
}

export async function createBillingPortalUrl(params: { customerId: string; returnUrl: string }) {
  const session = await stripeClient.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session.url;
}

export async function createBillingCheckoutUrl(params: {
  customerId?: string | null;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}) {
  const price = readDefaultPriceId();

  if (!process.env.STRIPE_SECRET_KEY || !price) {
    return null;
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    customer: params.customerId || undefined,
    customer_email: params.customerId ? undefined : params.customerEmail || undefined,
    line_items: [
      {
        price,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session.url || null;
}

export async function cancelBillingAtPeriodEnd(subscriptionId: string) {
  const subscription = await stripeClient.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    id: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd:
      typeof subscription.current_period_end === 'number'
        ? new Date(subscription.current_period_end * 1000)
        : null,
  };
}

export function mapStripeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
