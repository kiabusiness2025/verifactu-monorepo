// Sendcloud logistics adapter — aggregator connecting Correos, SEUR, MRW, GLS, DHL and more.
// API docs: https://docs.sendcloud.com/api/v2/
// Auth: Basic (API key as user, API secret as password). Base URL: https://panel.sendcloud.sc/api/v2/

import type { ListShipmentsParams, LogisticsClient, LogisticsShipment } from './logistics-client';

type ScParcel = {
  id: number;
  tracking_number: string;
  status: { id: number; message: string };
  name: string;
  address: string;
  city: string;
  country: { iso_2: string };
  weight: string;
  shipment_uuid: string;
  created_at: string;
  updated_at: string;
  date_updated: string;
  date_announced?: string;
};

type ScParcelList = { parcels: ScParcel[]; next?: string };

function mapStatus(statusId: number): LogisticsShipment['status'] {
  // Sendcloud status codes: https://docs.sendcloud.com/api/v2/#tag/Parcels/operation/listParcels
  if (statusId === 11 || statusId === 12) return 'delivered';
  if (statusId >= 80 && statusId < 90) return 'returned';
  if (statusId === 2000) return 'cancelled';
  if (statusId >= 1000) return 'in_transit';
  if (statusId >= 7 && statusId <= 9) return 'out_for_delivery';
  if (statusId >= 3) return 'in_transit';
  return 'pending';
}

export class SendcloudLogisticsClient implements LogisticsClient {
  readonly provider = 'sendcloud' as const;
  private readonly baseUrl = 'https://panel.sendcloud.sc/api/v2';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    // apiKey format: "key:secret" — split at first colon
    const sep = this.apiKey.indexOf(':');
    const user = sep > -1 ? this.apiKey.slice(0, sep) : this.apiKey;
    const pass = sep > -1 ? this.apiKey.slice(sep + 1) : '';
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(err?.error?.message ?? `Sendcloud error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listShipments(params?: ListShipmentsParams): Promise<LogisticsShipment[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.from) query['created_at__date__gte'] = params.from.split('T')[0]!;
    if (params?.to) query['created_at__date__lte'] = params.to.split('T')[0]!;
    if (params?.cursor) query['cursor'] = params.cursor;

    const data = await this.get<ScParcelList>('/parcels', query);
    return data.parcels.map((p) => ({
      id: String(p.id),
      trackingNumber: p.tracking_number,
      status: mapStatus(p.status.id),
      recipientName: p.name || null,
      destination: `${p.city}, ${p.country.iso_2}`,
      weight: p.weight ? parseFloat(p.weight) : null,
      cost: null,
      currency: null,
      createdAt: p.created_at,
      deliveredAt: null,
    }));
  }

  async trackShipment(trackingNumber: string): Promise<LogisticsShipment | null> {
    const data = await this.get<ScParcelList>('/parcels', {
      tracking_number: trackingNumber,
    });
    const p = data.parcels[0];
    if (!p) return null;
    return {
      id: String(p.id),
      trackingNumber: p.tracking_number,
      status: mapStatus(p.status.id),
      recipientName: p.name || null,
      destination: `${p.city}, ${p.country.iso_2}`,
      weight: p.weight ? parseFloat(p.weight) : null,
      cost: null,
      currency: null,
      createdAt: p.created_at,
      deliveredAt: null,
    };
  }
}
