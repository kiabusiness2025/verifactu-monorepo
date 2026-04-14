import prisma from '@/lib/prisma';
import { getAppUrl } from '@verifactu/utils';
import Stripe from 'stripe';

export type TenantBillingInvoice = {
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

export type TenantCurrentSubscription = {
  id: string | null;
  plan: {
    id: number | null;
    code: string | null;
    name: string | null;
  };
  status: string | null;
  stripeStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  paymentMethodSummary: string | null;
  portalAvailable: boolean;
  invoices: TenantBillingInvoice[];
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

function normalizeAmount(amount: number | null | undefined) {
  if (typeof amount !== 'number') return null;
  return amount / 100;
}

function formatCardBrand(brand: string | null | undefined) {
  if (!brand) return null;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export async function loadTenantCurrentSubscription(input: {
  tenantId: string;
  includeInvoices?: boolean;
}): Promise<TenantCurrentSubscription> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: input.tenantId },
    include: {
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const customerId = subscription?.stripeCustomerId ?? null;
  const subscriptionId = subscription?.stripeSubscriptionId ?? null;
  const stripe = getStripeClient();

  const billing: TenantCurrentSubscription = {
    id: subscription?.id ?? null,
    plan: {
      id: subscription?.plan?.id ?? null,
      code: subscription?.plan?.code ?? null,
      name: subscription?.plan?.name ?? null,
    },
    status: subscription?.status ?? null,
    stripeStatus: subscription?.stripeStatus ?? null,
    trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: subscription?.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    customerId,
    subscriptionId,
    paymentMethodSummary: null,
    portalAvailable: Boolean(stripe && customerId),
    invoices: [],
  };

  if (!stripe || !customerId) {
    return billing;
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
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
      const invoices = await stripe.invoices.list({
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
    console.warn('[billing] failed to load Stripe subscription data', {
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return billing;
}

export async function createTenantBillingPortalUrl(params: {
  customerId: string;
  returnUrl?: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('stripe_not_configured');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl || `${getAppUrl()}/dashboard/settings?tab=billing`,
  });

  return session.url;
}

export function mapBillingStripeError(error: unknown, fallback: string) {
  if (error instanceof Stripe.errors.StripeError) {
    return error.message || fallback;
  }

  if (error instanceof Error && error.message === 'stripe_not_configured') {
    return 'Stripe no esta configurado todavia para este entorno.';
  }

  return fallback;
}
