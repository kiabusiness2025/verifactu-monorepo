// Salesforce CRM adapter — stub pending client API access.
// API docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
// Auth: OAuth 2.0 (Connected App). Base URL: https://{instance}.salesforce.com/services/data/v58.0/

import type { CrmClient, CrmCompany, CrmContact, CrmDeal, ListCrmParams } from './crm-client';

export class SalesforceCrmClient implements CrmClient {
  readonly provider = 'salesforce' as const;

  constructor(private readonly _apiKey: string) {}

  listContacts(_params?: ListCrmParams): Promise<CrmContact[]> {
    throw new Error('Salesforce connector not yet implemented — awaiting API access');
  }
  listDeals(_params?: ListCrmParams): Promise<CrmDeal[]> {
    throw new Error('Salesforce connector not yet implemented — awaiting API access');
  }
  listCompanies(_params?: ListCrmParams): Promise<CrmCompany[]> {
    throw new Error('Salesforce connector not yet implemented — awaiting API access');
  }
}
