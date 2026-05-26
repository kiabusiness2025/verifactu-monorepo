// Paylands payment adapter — stub pending client API access.
// Gateway de pagos español con soporte nativo de Bizum y métodos locales.
// API docs: https://docs.paylands.com/en/reference/
// Auth: API key + signature. Base URL: https://api.paylands.com/v1/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class PaylandsPaymentClient implements PaymentClient {
  readonly provider = 'paylands' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('Paylands connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('Paylands connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('Paylands connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('Paylands connector not yet implemented — awaiting API access');
  }
}
