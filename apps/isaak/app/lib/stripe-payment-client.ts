// Stripe payment adapter — stub pending client API access.
// API docs: https://stripe.com/docs/api
// Auth: Bearer token (Secret key sk_live_... / sk_test_...). Base URL: https://api.stripe.com/v1/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class StripePaymentClient implements PaymentClient {
  readonly provider = 'stripe' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('Stripe connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('Stripe connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('Stripe connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('Stripe connector not yet implemented — awaiting API access');
  }
}
