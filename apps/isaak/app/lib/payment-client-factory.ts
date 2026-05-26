// Factory: returns the right PaymentClient for a tenant based on their active ExternalConnection.
// Supported providers: Stripe, Redsys, GoCardless (payments), PayPal, Mollie, SumUp, Paylands.

import { decryptHoldedSecret } from './holded-integration';
import type { PaymentClient } from './payment-client';
import { prisma } from './prisma';

export type { PaymentClient };

export const PAYMENT_PROVIDERS = [
  'stripe',
  'redsys',
  'gocardless',
  'paypal',
  'mollie',
  'sumup',
  'paylands',
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class PaymentNotConnectedError extends Error {
  constructor(public readonly tenantId: string) {
    super(`No payment provider connected for tenant ${tenantId}`);
    this.name = 'PaymentNotConnectedError';
  }
}

export async function getPaymentClient(tenantId: string): Promise<PaymentClient> {
  const conn = await prisma.externalConnection.findFirst({
    where: {
      tenantId,
      provider: { in: [...PAYMENT_PROVIDERS] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
  });

  if (!conn) throw new PaymentNotConnectedError(tenantId);

  const apiKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
  switch (conn.provider) {
    case 'stripe': {
      const { StripePaymentClient } = await import('./stripe-payment-client');
      return new StripePaymentClient(apiKey);
    }
    case 'redsys': {
      const { RedsysPaymentClient } = await import('./redsys-payment-client');
      return new RedsysPaymentClient(apiKey);
    }
    case 'gocardless': {
      const { GoCardlessPaymentClient } = await import('./gocardless-payment-client');
      return new GoCardlessPaymentClient(apiKey);
    }
    case 'paypal': {
      const { PayPalPaymentClient } = await import('./paypal-payment-client');
      return new PayPalPaymentClient(apiKey);
    }
    case 'mollie': {
      const { MolliePaymentClient } = await import('./mollie-payment-client');
      return new MolliePaymentClient(apiKey);
    }
    case 'sumup': {
      const { SumUpPaymentClient } = await import('./sumup-payment-client');
      return new SumUpPaymentClient(apiKey);
    }
    case 'paylands': {
      const { PaylandsPaymentClient } = await import('./paylands-payment-client');
      return new PaylandsPaymentClient(apiKey);
    }
    default:
      throw new Error(`Payment provider ${conn.provider} not yet implemented`);
  }
}

export async function hasPaymentConnected(tenantId: string): Promise<boolean> {
  const count = await prisma.externalConnection.count({
    where: {
      tenantId,
      provider: { in: [...PAYMENT_PROVIDERS] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
