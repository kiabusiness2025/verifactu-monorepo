// CrmClient interface — abstraction over CRM platforms (HubSpot, Salesforce, Pipedrive…).

export type CrmContact = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  createdAt: string;
};

export type CrmDeal = {
  id: string;
  name: string;
  amount: number | null;
  stage: string;
  closeDate: string | null;
  contactId: string | null;
  createdAt: string;
};

export type CrmCompany = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  createdAt: string;
};

export type ListCrmParams = {
  limit?: number;
  cursor?: string;
};

export interface CrmClient {
  readonly provider: string;
  listContacts(params?: ListCrmParams): Promise<CrmContact[]>;
  listDeals(params?: ListCrmParams): Promise<CrmDeal[]>;
  listCompanies(params?: ListCrmParams): Promise<CrmCompany[]>;
}
