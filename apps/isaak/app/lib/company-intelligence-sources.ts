import type {
  CompanyMatch,
  CompanyProfileInput,
  LeiSignal,
  PublicContractSignal,
  RegistryEvent,
  ViesSignal,
} from './company-intelligence-types';

// ── Adapter interface ─────────────────────────────────────────────────────────

export interface CompanyDataSourceAdapter {
  readonly sourceId: string;
  search(input: CompanyProfileInput): Promise<CompanyMatch[]>;
}

// ── UserProvided adapter ──────────────────────────────────────────────────────

export class UserProvidedAdapter implements CompanyDataSourceAdapter {
  readonly sourceId = 'USER';

  async search(input: CompanyProfileInput): Promise<CompanyMatch[]> {
    if (!input.legalName && !input.nif) return [];
    return [
      {
        source: 'USER',
        legalName: input.legalName,
        nif: input.nif,
        vatNumber: input.vatNumber,
        province: input.province,
        address: input.address,
        confidence: 'HIGH',
        score: 100,
      },
    ];
  }
}

// ── BORME adapter (real implementation requires web scraping — mockable) ──────

export interface BormeAdapterOptions {
  /** Inject a custom fetch implementation (for tests) */
  fetchFn?: typeof fetch;
  /** Base URL override */
  baseUrl?: string;
}

export type BormeResult = {
  matches: CompanyMatch[];
  events: RegistryEvent[];
};

export class BormeAdapter implements CompanyDataSourceAdapter {
  readonly sourceId = 'BORME';
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: BormeAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://www.boe.es/borme';
  }

  // Public: search only returns matches; enrichEvents() is separate
  async search(input: CompanyProfileInput): Promise<CompanyMatch[]> {
    // BORME does not have a public search API — actual lookups require
    // either the BOE API (for recent publications) or screen-scraping.
    // Return empty by default; real data comes through enriched registry events.
    void this.baseUrl; // reserved for future implementation
    void this.fetchFn;
    void input;
    return [];
  }
}

// ── VIES adapter ──────────────────────────────────────────────────────────────

export interface ViesAdapterOptions {
  fetchFn?: typeof fetch;
  serviceUrl?: string;
}

export class ViesAdapter implements CompanyDataSourceAdapter {
  readonly sourceId = 'VIES';
  private readonly fetchFn: typeof fetch;
  private readonly serviceUrl: string;

  constructor(options: ViesAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.serviceUrl =
      options.serviceUrl ?? 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/ES/vat/';
  }

  async search(input: CompanyProfileInput): Promise<CompanyMatch[]> {
    const vatNumber = input.vatNumber ?? (input.nif ? `ES${input.nif}` : undefined);
    if (!vatNumber) return [];

    const vatClean = vatNumber.replace(/^ES/i, '');
    const url = `${this.serviceUrl}${encodeURIComponent(vatClean)}`;

    try {
      const res = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        valid?: boolean;
        name?: string;
        address?: string;
        vatNumber?: string;
      };
      if (!data.valid) return [];
      return [
        {
          source: 'VIES',
          legalName: data.name,
          vatNumber: `ES${vatClean}`,
          address: data.address,
          confidence: 'HIGH',
          score: 80,
        },
      ];
    } catch {
      return [];
    }
  }

  async checkVat(vatNumber: string): Promise<ViesSignal | null> {
    const vatClean = vatNumber.replace(/^ES/i, '');
    const url = `${this.serviceUrl}${encodeURIComponent(vatClean)}`;
    try {
      const res = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        valid?: boolean;
        name?: string;
        address?: string;
        vatNumber?: string;
      };
      return {
        vatNumber: `ES${vatClean}`,
        valid: data.valid ?? false,
        checkedAt: new Date().toISOString(),
        name: data.name,
        address: data.address,
        confidence: 'HIGH',
      };
    } catch {
      return null;
    }
  }
}

// ── GLEIF adapter (LEI lookup) ────────────────────────────────────────────────

export interface GleifAdapterOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

export class GleifAdapter implements CompanyDataSourceAdapter {
  readonly sourceId = 'GLEIF';
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: GleifAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.gleif.org/api/v1';
  }

  async search(input: CompanyProfileInput): Promise<CompanyMatch[]> {
    if (!input.legalName && !input.nif) return [];
    const query = input.legalName ?? input.nif ?? '';
    const url = `${this.baseUrl}/fuzzycompletions?field=fullLegalName&q=${encodeURIComponent(query)}`;
    try {
      const res = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: Array<{ attributes?: { value?: string } }> };
      const items = data.data ?? [];
      return items.slice(0, 3).map((item) => ({
        source: 'GLEIF' as const,
        legalName: item.attributes?.value,
        confidence: 'MEDIUM' as const,
        score: 40,
      }));
    } catch {
      return [];
    }
  }

  async lookupLei(name: string): Promise<LeiSignal | null> {
    const url = `${this.baseUrl}/lei-records?filter[entity.legalName]=${encodeURIComponent(name)}&page[size]=1`;
    try {
      const res = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        data?: Array<{
          attributes?: {
            lei?: string;
            entity?: {
              status?: string;
              legalName?: { name?: string };
              legalAddress?: { country?: string };
              jurisdiction?: string;
            };
          };
        }>;
      };
      const record = data.data?.[0]?.attributes;
      if (!record?.lei) return null;
      return {
        lei: record.lei,
        status: record.entity?.status,
        legalName: record.entity?.legalName?.name,
        jurisdiction: record.entity?.jurisdiction ?? record.entity?.legalAddress?.country,
        confidence: 'MEDIUM',
      };
    } catch {
      return null;
    }
  }
}

// ── PLACSP adapter (contratos del sector público) ─────────────────────────────

export interface PlacspAdapterOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

export class PlacspAdapter implements CompanyDataSourceAdapter {
  readonly sourceId = 'PLACSP';
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: PlacspAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl =
      options.baseUrl ??
      'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom';
  }

  async search(_input: CompanyProfileInput): Promise<CompanyMatch[]> {
    // PLACSP does not have a text-search REST API; it exposes ATOM feeds
    // filtered by contracting authority, not by contractor NIF.
    // Signal enrichment is done via lookupContracts() below.
    void this.baseUrl;
    void this.fetchFn;
    return [];
  }

  async lookupContracts(nif: string): Promise<PublicContractSignal[]> {
    // Placeholder — actual SPARQL/ATOM queries require PCSP API access
    void this.fetchFn;
    void nif;
    return [];
  }
}
