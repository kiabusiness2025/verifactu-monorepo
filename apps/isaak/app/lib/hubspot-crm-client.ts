// HubSpot CRM adapter.
// API docs: https://developers.hubspot.com/docs/api/crm/contacts
// Auth: Bearer token (Private App access token). Base URL: https://api.hubapi.com/

import type { CrmClient, CrmCompany, CrmContact, CrmDeal, ListCrmParams } from './crm-client';

type HsContact = {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    createdate?: string;
  };
};

type HsDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    createdate?: string;
  };
};

type HsCompany = {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    createdate?: string;
  };
};

type HsListResponse<T> = { results: T[]; paging?: { next?: { after?: string } } };

export class HubSpotCrmClient implements CrmClient {
  readonly provider = 'hubspot' as const;
  private readonly baseUrl = 'https://api.hubapi.com';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `HubSpot error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listContacts(params?: ListCrmParams): Promise<CrmContact[]> {
    const query: Record<string, string> = {
      limit: String(params?.limit ?? 100),
      properties: 'firstname,lastname,email,phone,company',
    };
    if (params?.cursor) query['after'] = params.cursor;

    const data = await this.get<HsListResponse<HsContact>>('/crm/v3/objects/contacts', query);
    return data.results.map((c) => ({
      id: c.id,
      name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || null,
      email: c.properties.email ?? null,
      phone: c.properties.phone ?? null,
      company: c.properties.company ?? null,
      createdAt: c.properties.createdate ?? new Date().toISOString(),
    }));
  }

  async listDeals(params?: ListCrmParams): Promise<CrmDeal[]> {
    const query: Record<string, string> = {
      limit: String(params?.limit ?? 100),
      properties: 'dealname,amount,dealstage,closedate,createdate',
    };
    if (params?.cursor) query['after'] = params.cursor;

    const data = await this.get<HsListResponse<HsDeal>>('/crm/v3/objects/deals', query);
    return data.results.map((d) => ({
      id: d.id,
      name: d.properties.dealname ?? `Deal ${d.id}`,
      amount: d.properties.amount ? parseFloat(d.properties.amount) : null,
      stage: d.properties.dealstage ?? 'unknown',
      closeDate: d.properties.closedate ?? null,
      contactId: null,
      createdAt: d.properties.createdate ?? new Date().toISOString(),
    }));
  }

  async listCompanies(params?: ListCrmParams): Promise<CrmCompany[]> {
    const query: Record<string, string> = {
      limit: String(params?.limit ?? 100),
      properties: 'name,domain,industry,createdate',
    };
    if (params?.cursor) query['after'] = params.cursor;

    const data = await this.get<HsListResponse<HsCompany>>('/crm/v3/objects/companies', query);
    return data.results.map((c) => ({
      id: c.id,
      name: c.properties.name ?? `Company ${c.id}`,
      domain: c.properties.domain ?? null,
      industry: c.properties.industry ?? null,
      createdAt: c.properties.createdate ?? new Date().toISOString(),
    }));
  }
}
