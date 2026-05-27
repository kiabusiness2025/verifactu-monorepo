// Logistics abstraction layer — provider-agnostic interface for carrier integrations.
// Supported: Correos, MRW, SEUR, GLS, DHL, Sendcloud (aggregator).

export type LogisticsProvider = 'correos' | 'mrw' | 'seur' | 'gls' | 'dhl' | 'sendcloud';

export const LOGISTICS_PROVIDERS: readonly LogisticsProvider[] = [
  'correos',
  'mrw',
  'seur',
  'gls',
  'dhl',
  'sendcloud',
];

export type ShipmentStatus =
  | 'pending'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'unknown';

export type LogisticsShipment = {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  recipientName?: string | null;
  destination: string;
  weight?: number | null;
  cost?: number | null;
  currency?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
};

export type ListShipmentsParams = {
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export interface LogisticsClient {
  readonly provider: LogisticsProvider;
  listShipments(params?: ListShipmentsParams): Promise<LogisticsShipment[]>;
  trackShipment(trackingNumber: string): Promise<LogisticsShipment | null>;
}
