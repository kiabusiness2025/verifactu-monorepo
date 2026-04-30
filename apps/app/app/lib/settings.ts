import { prisma } from '@/lib/prisma';
import { stripeClient } from '@verifactu/integrations';

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
  invoices: SettingsBillingInvoice[];
};

function normalizeAmount(amount: number | null | undefined) {
  if (typeof amount !== 'number') return null;
  return amount / 100;
}

function formatCardBrand(brand: string | null | undefined) {
  if (!brand) return null;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
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
    checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && customerId),
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
    console.warn('[app settings] failed to load Stripe billing data', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return billing;
}
