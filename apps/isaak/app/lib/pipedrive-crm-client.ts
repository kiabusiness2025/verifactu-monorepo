// Pipedrive CRM adapter.
// API docs: https://developers.pipedrive.com/docs/api/v1
// Auth: API token (header X-Api-Token). Base URL: https://api.pipedrive.com/v1/

import type { CrmClient, CrmCompany, CrmContact, CrmDeal, ListCrmParams } from './crm-client';

// ── Pipedrive API shapes ───────────────────────────────────────────────────────

type PdPerson = {
  id: number;
  name: string;
  primary_email?: string;
  email?: { value: string; primary?: boolean }[];
  phone?: { value: string; primary?: boolean }[];
  org_name?: string | null;
  add_time: string;
};

type PdDeal = {
  id: number;
  title: string;
  value?: number | null;
  currency?: string;
  stage_id: number;
  stage_name?: string;
  close_time?: string | null;
  expected_close_date?: string | null;
  person_id?: { value: number } | null;
  add_time: string;
};

type PdOrganization = {
  id: number;
  name: string;
  web?: string | null;
  industry?: string | null;
  add_time: string;
};

type PdList<T> = {
  success: boolean;
  data: T[] | null;
  additional_data?: { pagination?: { next_start?: number } };
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class PipedriveCrmClient implements CrmClient {
  readonly provider = 'pipedrive' as const;
  private readonly baseUrl = 'https://api.pipedrive.com/v1';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Token': this.apiKey },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? `Pipedrive error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listContacts(params?: ListCrmParams): Promise<CrmContact[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.cursor) query['start'] = params.cursor;

    const data = await this.get<PdList<PdPerson>>('/persons', query);
    return (data.data ?? []).map((p) => {
      const primaryEmail =
        p.primary_email ?? p.email?.find((e) => e.primary)?.value ?? p.email?.[0]?.value ?? null;
      const primaryPhone = p.phone?.find((ph) => ph.primary)?.value ?? p.phone?.[0]?.value ?? null;
      return {
        id: String(p.id),
        name: p.name || null,
        email: primaryEmail,
        phone: primaryPhone,
        company: p.org_name ?? null,
        createdAt: p.add_time,
      };
    });
  }

  async listDeals(params?: ListCrmParams): Promise<CrmDeal[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.cursor) query['start'] = params.cursor;

    const data = await this.get<PdList<PdDeal>>('/deals', query);
    return (data.data ?? []).map((d) => ({
      id: String(d.id),
      name: d.title,
      amount: d.value ?? null,
      stage: d.stage_name ?? String(d.stage_id),
      closeDate: d.close_time ?? d.expected_close_date ?? null,
      contactId: d.person_id ? String(d.person_id.value) : null,
      createdAt: d.add_time,
    }));
  }

  async listCompanies(params?: ListCrmParams): Promise<CrmCompany[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.cursor) query['start'] = params.cursor;

    const data = await this.get<PdList<PdOrganization>>('/organizations', query);
    return (data.data ?? []).map((o) => ({
      id: String(o.id),
      name: o.name,
      domain: o.web ?? null,
      industry: o.industry ?? null,
      createdAt: o.add_time,
    }));
  }
}
