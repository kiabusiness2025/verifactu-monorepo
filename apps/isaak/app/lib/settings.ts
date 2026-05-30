import { getHoldedConnection } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import { getIsaakOnboardingState, stripeClient } from '@verifactu/integrations';
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
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
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
  customInstructions?: string;
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
  trialEndsAt: string | null;
  daysUntilTrialEnd: number | null;
  nextRenewalAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethodSummary: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  portalAvailable: boolean;
  checkoutAvailable: boolean;
  cancelAvailable: boolean;
  pauseAvailable: boolean;
  isPaused: boolean;
  pausedUntil: string | null;
  invoices: SettingsBillingInvoice[];
};

export type TeamMember = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  isCurrentUser: boolean;
};

export type WorkspaceSummary = {
  tenantId: string;
  name: string;
  taxId: string | null;
  role: string;
  isCurrent: boolean;
};

export type SettingsTeamData = {
  enabled: boolean;
  activeMembers: number;
  maxSeats: number;
  planCode: string;
  canManage: boolean;
  members: TeamMember[];
  workspaces: WorkspaceSummary[];
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

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
}

function readCompanyBranding(value: unknown): {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
} {
  const fallback = {
    logoUrl: null,
    primaryColor: '#2361D8',
    secondaryColor: '#0F172A',
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const root = value as Record<string, unknown>;
  const brandingRaw = root.branding;
  if (!brandingRaw || typeof brandingRaw !== 'object' || Array.isArray(brandingRaw)) {
    return fallback;
  }

  const branding = brandingRaw as Record<string, unknown>;
  const logoUrl = typeof branding.logoUrl === 'string' ? branding.logoUrl.trim() : '';
  return {
    logoUrl: logoUrl || null,
    primaryColor: normalizeHexColor(branding.primaryColor, fallback.primaryColor),
    secondaryColor: normalizeHexColor(branding.secondaryColor, fallback.secondaryColor),
  };
}

function formatCardBrand(brand: string | null | undefined) {
  if (!brand) return null;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function readPriceId(cadence: 'monthly' | 'annual' = 'monthly') {
  const envVar = cadence === 'annual' ? 'STRIPE_PRICE_ISAAK_ANNUAL' : 'STRIPE_PRICE_ISAAK_MONTHLY';
  const priceId = process.env[envVar]?.trim() ?? '';
  if (!priceId && process.env.NODE_ENV === 'production') {
    console.warn(`[isaak/billing] ${envVar} is not set — checkout will be unavailable`);
  }
  return priceId;
}

// V1 LAUNCH (2026-05-28): el plan Pro arranca con 14 días de trial sin tarjeta.
// Si el flag está OFF, el checkout sigue cobrando inmediatamente como antes.
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.
const ISAAK_PRO_TRIAL_DAYS = 14;

function readDefaultPriceId() {
  return readPriceId('monthly');
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
  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const daysUntilTrialEnd =
    trialEndsAt && subscription?.status === 'trial'
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

  const billing: SettingsBillingData = {
    name: subscription?.plan?.name ?? 'Plan gratuito',
    code: subscription?.plan?.code ?? 'free',
    status: subscription?.status ?? 'active',
    stripeStatus: subscription?.stripeStatus ?? null,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    daysUntilTrialEnd,
    nextRenewalAt: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    paymentMethodSummary: null,
    customerId,
    subscriptionId,
    portalAvailable: Boolean(process.env.STRIPE_SECRET_KEY && customerId),
    checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && readDefaultPriceId()),
    cancelAvailable: Boolean(process.env.STRIPE_SECRET_KEY && subscriptionId),
    pauseAvailable: Boolean(process.env.STRIPE_SECRET_KEY && subscriptionId),
    isPaused: false,
    pausedUntil: null,
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

    // V1.8.1 — Estado de pausa de Stripe (pause_collection). Si está
    // activa, exponemos pausedUntil para que el cliente muestre banner
    // y botón "Reanudar". El flag pauseAvailable se calcula igual que
    // cancelAvailable (requiere subscriptionId + Stripe configurado).
    const pause = activeSubscription?.pause_collection;
    if (pause) {
      billing.pausedUntil =
        typeof pause.resumes_at === 'number'
          ? new Date(pause.resumes_at * 1000).toISOString()
          : null;
      billing.isPaused = true;
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

function maxSeatsForPlan(planCode: string): number {
  switch (planCode) {
    case 'enterprise':
      return -1;
    case 'business':
      return 10;
    case 'empresa':
      return 5;
    case 'pyme':
      return 3;
    default:
      return 1;
  }
}

function canManageTeam(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'company_admin';
}

export async function loadSettingsData(session: SettingsSession): Promise<SettingsData> {
  const [
    user,
    tenantProfile,
    connection,
    onboardingState,
    billing,
    memberships,
    subscription,
    userWorkspaces,
  ] = await Promise.all([
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
          adminEditHistory: true,
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
      prisma.membership.findMany({
        where: {
          tenantId: session.tenantId,
          status: { in: ['active', 'invited'] },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tenantSubscription.findFirst({
        where: { tenantId: session.tenantId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.membership.findMany({
        where: { userId: session.userId, status: 'active' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              legalName: true,
              profile: { select: { tradeName: true, legalName: true, taxId: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

  const onboarding = onboardingState.profile;
  const instructions = onboardingState.instructions;

  // V1.6.4 — Custom instructions del tenant (sub-key del whitelabelConfig)
  let tenantCustomInstructions = '';
  try {
    const t = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { whitelabelConfig: true },
    });
    const cfg = (t?.whitelabelConfig ?? null) as { aiCustomInstructions?: unknown } | null;
    if (cfg && typeof cfg.aiCustomInstructions === 'string') {
      tenantCustomInstructions = cfg.aiCustomInstructions;
    }
  } catch {
    /* fail-silent */
  }

  const planCode = subscription?.plan?.code ?? billing.code ?? 'free';
  const maxSeats = maxSeatsForPlan(planCode);
  const activeMembers = memberships.filter((m) => m.status === 'active').length;
  const callerMembership = memberships.find((m) => m.userId === session.userId);
  const callerRole = callerMembership?.role ?? 'member';

  const workspaces: WorkspaceSummary[] = userWorkspaces.map((m) => ({
    tenantId: m.tenantId,
    role: m.role,
    name:
      m.tenant.profile?.tradeName ??
      m.tenant.profile?.legalName ??
      m.tenant.legalName ??
      m.tenant.name ??
      'Espacio sin nombre',
    taxId: m.tenant.profile?.taxId ?? null,
    isCurrent: m.tenantId === session.tenantId,
  }));

  const teamData: SettingsTeamData = {
    enabled: true,
    activeMembers,
    maxSeats,
    planCode,
    canManage: canManageTeam(callerRole),
    members: memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      confirmedAt: m.confirmedAt?.toISOString() ?? null,
      isCurrentUser: m.userId === session.userId,
    })),
    workspaces,
  };

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
      ...readCompanyBranding(tenantProfile?.adminEditHistory),
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
      customInstructions: tenantCustomInstructions,
      resetUrl: buildHoldedProfileOnboardingUrl(
        'isaak_settings_repersonalize',
        `${ISAAK_PUBLIC_URL}/chat?source=isaak_settings`
      ),
    },
    billing,
    team: teamData,
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
  /** 'monthly' | 'annual'. Default: 'monthly'. */
  cadence?: 'monthly' | 'annual';
  /**
   * Si true (default en V1 launch), arranca con 14 días de trial SIN tarjeta
   * — el cliente NO necesita método de pago para empezar.
   */
  withTrial?: boolean;
}) {
  const cadence = params.cadence ?? 'monthly';
  const price = readPriceId(cadence);

  if (!process.env.STRIPE_SECRET_KEY || !price) {
    return null;
  }

  const v1 = process.env.NEXT_PUBLIC_ISAAK_V1_LAUNCH === 'true';
  const withTrial = params.withTrial ?? v1;

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
    ...(withTrial
      ? {
          subscription_data: { trial_period_days: ISAAK_PRO_TRIAL_DAYS },
          // 'if_required' permite empezar el trial sin tarjeta. Stripe pedirá
          // método de pago automáticamente cuando termine el trial.
          payment_method_collection: 'if_required' as const,
        }
      : {}),
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

// V1.7.3 — Pause / Resume.
// Stripe permite "pause_collection" para detener el cobro manteniendo
// la suscripción activa. Tres comportamientos:
//   - 'mark_uncollectible' → no se cobra y las facturas quedan así (lo
//     que usamos para pausa típica del usuario).
//   - 'keep_as_draft' / 'void' → variantes administrativas, no las
//     exponemos al usuario.
// Pasamos `resumes_at` (epoch seconds) para que Stripe reanude el cobro
// automáticamente. Si meses === null, pausa indefinida hasta que el
// usuario resume manualmente.
export async function pauseSubscription(subscriptionId: string, months: number | null) {
  const resumesAt =
    months && months > 0
      ? Math.floor(Date.now() / 1000) + months * 30 * 24 * 60 * 60
      : undefined;
  const subscription = await stripeClient.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'mark_uncollectible',
      ...(resumesAt ? { resumes_at: resumesAt } : {}),
    },
  });
  return {
    id: subscription.id,
    status: subscription.status,
    pausedUntil: resumesAt ? new Date(resumesAt * 1000) : null,
  };
}

export async function resumeSubscription(subscriptionId: string) {
  const subscription = await stripeClient.subscriptions.update(subscriptionId, {
    pause_collection: '',
  } as unknown as Parameters<typeof stripeClient.subscriptions.update>[1]);
  return {
    id: subscription.id,
    status: subscription.status,
  };
}

export function mapStripeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
