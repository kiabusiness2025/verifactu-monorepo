// Mollie payment adapter — stub pending client API access.
// API docs: https://docs.mollie.com/reference/introduction
// Auth: Bearer token (API key live_... / test_...). Base URL: https://api.mollie.com/v2/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class MolliePaymentClient implements PaymentClient {
  readonly provider = 'mollie' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('Mollie connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('Mollie connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('Mollie connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('Mollie connector not yet implemented — awaiting API access');
  }
}
