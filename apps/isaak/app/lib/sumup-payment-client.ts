// SumUp payment adapter — stub pending client API access.
// API docs: https://developer.sumup.com/api
// Auth: Bearer token (OAuth 2.0). Base URL: https://api.sumup.com/v0.1/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class SumUpPaymentClient implements PaymentClient {
  readonly provider = 'sumup' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('SumUp connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('SumUp connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('SumUp connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('SumUp connector not yet implemented — awaiting API access');
  }
}
