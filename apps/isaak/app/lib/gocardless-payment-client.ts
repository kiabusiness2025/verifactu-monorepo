// GoCardless payment adapter — stub pending client API access.
// NOTE: this connector is for GoCardless PAYMENTS (direct debit, SEPA mandates).
// GoCardless Bankdata (AIS/Open Banking) sunset — replaced by Enable Banking in this project.
// API docs: https://developer.gocardless.com/api-reference/
// Auth: Bearer token. Base URL: https://api.gocardless.com/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class GoCardlessPaymentClient implements PaymentClient {
  readonly provider = 'gocardless' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('GoCardless connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('GoCardless connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('GoCardless connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('GoCardless connector not yet implemented — awaiting API access');
  }
}
