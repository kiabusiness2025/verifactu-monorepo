// SEUR logistics adapter — stub pending API access.
// API docs: https://www.seur.com/es/clientes/integracion-api.shtml
// Auth: API key + customer account. Base URL: https://ws.seur.com/

import type { ListShipmentsParams, LogisticsClient, LogisticsShipment } from './logistics-client';

export class SeurLogisticsClient implements LogisticsClient {
  readonly provider = 'seur' as const;

  constructor(private readonly _apiKey: string) {}

  listShipments(_params?: ListShipmentsParams): Promise<LogisticsShipment[]> {
    throw new Error('SEUR connector not yet implemented — awaiting API access');
  }
  trackShipment(_trackingNumber: string): Promise<LogisticsShipment | null> {
    throw new Error('SEUR connector not yet implemented — awaiting API access');
  }
}
