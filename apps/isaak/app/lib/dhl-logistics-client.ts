// DHL Express logistics adapter — stub pending API access.
// API docs: https://developer.dhl.com/api-reference/dhl-express
// Auth: API key (header DHL-API-Key). Base URL: https://api-eu.dhl.com/

import type { ListShipmentsParams, LogisticsClient, LogisticsShipment } from './logistics-client';

export class DhlLogisticsClient implements LogisticsClient {
  readonly provider = 'dhl' as const;

  constructor(private readonly _apiKey: string) {}

  listShipments(_params?: ListShipmentsParams): Promise<LogisticsShipment[]> {
    throw new Error('DHL Express connector not yet implemented — awaiting API access');
  }
  trackShipment(_trackingNumber: string): Promise<LogisticsShipment | null> {
    throw new Error('DHL Express connector not yet implemented — awaiting API access');
  }
}
