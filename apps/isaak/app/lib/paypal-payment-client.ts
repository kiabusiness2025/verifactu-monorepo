// PayPal payment adapter — stub pending client API access.
// API docs: https://developer.paypal.com/api/rest/
// Auth: OAuth 2.0 (Client ID + Secret → Bearer token). Base URL: https://api-m.paypal.com/v2/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class PayPalPaymentClient implements PaymentClient {
  readonly provider = 'paypal' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('PayPal connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('PayPal connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('PayPal connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('PayPal connector not yet implemented — awaiting API access');
  }
}
