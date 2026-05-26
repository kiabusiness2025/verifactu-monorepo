// Pipedrive CRM adapter — stub pending client API access.
// API docs: https://developers.pipedrive.com/docs/api/v1
// Auth: API token (query param ?api_token=...). Base URL: https://api.pipedrive.com/v1/

import type { CrmClient, CrmCompany, CrmContact, CrmDeal, ListCrmParams } from './crm-client';

export class PipedriveCrmClient implements CrmClient {
  readonly provider = 'pipedrive' as const;

  constructor(private readonly _apiKey: string) {}

  listContacts(_params?: ListCrmParams): Promise<CrmContact[]> {
    throw new Error('Pipedrive connector not yet implemented — awaiting API access');
  }
  listDeals(_params?: ListCrmParams): Promise<CrmDeal[]> {
    throw new Error('Pipedrive connector not yet implemented — awaiting API access');
  }
  listCompanies(_params?: ListCrmParams): Promise<CrmCompany[]> {
    throw new Error('Pipedrive connector not yet implemented — awaiting API access');
  }
}
