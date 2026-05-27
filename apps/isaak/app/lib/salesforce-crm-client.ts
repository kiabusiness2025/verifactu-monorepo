// Salesforce CRM adapter.
// API docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
// Auth: OAuth 2.0 username-password flow (Connected App credentials + Salesforce login).
// Stored credential format: "instanceUrl::clientId::clientSecret::username::password"
// Base URL: https://{instance}.salesforce.com/services/data/v62.0/

import type { CrmClient, CrmCompany, CrmContact, CrmDeal, ListCrmParams } from './crm-client';

// ── Salesforce API shapes ──────────────────────────────────────────────────────

type SfTokenResponse = {
  access_token: string;
  instance_url: string;
  token_type: string;
};

type SfContact = {
  Id: string;
  Name?: string | null;
  Email?: string | null;
  Phone?: string | null;
  MobilePhone?: string | null;
  Account?: { Name?: string } | null;
  CreatedDate: string;
};

type SfOpportunity = {
  Id: string;
  Name: string;
  Amount?: number | null;
  StageName: string;
  CloseDate?: string | null;
  ContactId?: string | null;
  CreatedDate: string;
};

type SfAccount = {
  Id: string;
  Name: string;
  Website?: string | null;
  Industry?: string | null;
  CreatedDate: string;
};

type SfQueryResponse<T> = {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string | null;
  records: T[];
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class SalesforceCrmClient implements CrmClient {
  readonly provider = 'salesforce' as const;
  private readonly loginUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username: string;
  private readonly password: string;
  private cachedToken: { token: string; instanceUrl: string; expiresAt: number } | null = null;

  constructor(credential: string) {
    // Format: "instanceUrl::clientId::clientSecret::username::password"
    // instanceUrl is used as the OAuth login domain, e.g. "https://login.salesforce.com"
    // or a custom My Domain like "https://company.my.salesforce.com"
    const parts = credential.split('::');
    this.loginUrl = (parts[0] ?? 'https://login.salesforce.com').replace(/\/$/, '');
    this.clientId = parts[1] ?? '';
    this.clientSecret = parts[2] ?? '';
    this.username = parts[3] ?? '';
    this.password = parts[4] ?? '';
  }

  private async getAccessToken(): Promise<{ token: string; instanceUrl: string }> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return { token: this.cachedToken.token, instanceUrl: this.cachedToken.instanceUrl };
    }
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
    });
    const res = await fetch(`${this.loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error_description?: string } | null;
      throw new Error(err?.error_description ?? `Salesforce auth error ${res.status}`);
    }
    const data = (await res.json()) as SfTokenResponse;
    // Salesforce access tokens expire in 2 hours; cache with 5 min margin
    this.cachedToken = {
      token: data.access_token,
      instanceUrl: data.instance_url,
      expiresAt: Date.now() + 115 * 60 * 1000,
    };
    return { token: data.access_token, instanceUrl: data.instance_url };
  }

  private async query<T>(soql: string): Promise<T[]> {
    const { token, instanceUrl } = await this.getAccessToken();
    const url = new URL(`${instanceUrl}/services/data/v62.0/query`);
    url.searchParams.set('q', soql);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string }[] | null;
      throw new Error(err?.[0]?.message ?? `Salesforce error ${res.status}`);
    }
    const data = (await res.json()) as SfQueryResponse<T>;
    return data.records;
  }

  async listContacts(params?: ListCrmParams): Promise<CrmContact[]> {
    const limit = params?.limit ?? 100;
    const offset = params?.cursor ? ` OFFSET ${params.cursor}` : '';
    const records = await this.query<SfContact>(
      `SELECT Id, Name, Email, Phone, MobilePhone, Account.Name, CreatedDate FROM Contact LIMIT ${limit}${offset}`
    );
    return records.map((c) => ({
      id: c.Id,
      name: c.Name ?? null,
      email: c.Email ?? null,
      phone: c.Phone ?? c.MobilePhone ?? null,
      company: c.Account?.Name ?? null,
      createdAt: c.CreatedDate,
    }));
  }

  async listDeals(params?: ListCrmParams): Promise<CrmDeal[]> {
    const limit = params?.limit ?? 100;
    const offset = params?.cursor ? ` OFFSET ${params.cursor}` : '';
    const records = await this.query<SfOpportunity>(
      `SELECT Id, Name, Amount, StageName, CloseDate, ContactId, CreatedDate FROM Opportunity LIMIT ${limit}${offset}`
    );
    return records.map((o) => ({
      id: o.Id,
      name: o.Name,
      amount: o.Amount ?? null,
      stage: o.StageName,
      closeDate: o.CloseDate ?? null,
      contactId: o.ContactId ?? null,
      createdAt: o.CreatedDate,
    }));
  }

  async listCompanies(params?: ListCrmParams): Promise<CrmCompany[]> {
    const limit = params?.limit ?? 100;
    const offset = params?.cursor ? ` OFFSET ${params.cursor}` : '';
    const records = await this.query<SfAccount>(
      `SELECT Id, Name, Website, Industry, CreatedDate FROM Account LIMIT ${limit}${offset}`
    );
    return records.map((a) => ({
      id: a.Id,
      name: a.Name,
      domain: a.Website ?? null,
      industry: a.Industry ?? null,
      createdAt: a.CreatedDate,
    }));
  }
}
