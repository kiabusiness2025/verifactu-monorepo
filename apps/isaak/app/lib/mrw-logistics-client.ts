// MRW logistics adapter — stub pending API access.
// API docs: https://www.mrw.es/clientes/herramientas/api-web-service/
// Auth: Franchise + subscriber code + API key. Base URL: https://franquicia.mrw.es/

import type { ListShipmentsParams, LogisticsClient, LogisticsShipment } from './logistics-client';

export class MrwLogisticsClient implements LogisticsClient {
  readonly provider = 'mrw' as const;

  constructor(private readonly _apiKey: string) {}

  listShipments(_params?: ListShipmentsParams): Promise<LogisticsShipment[]> {
    throw new Error('MRW connector not yet implemented — awaiting API access');
  }
  trackShipment(_trackingNumber: string): Promise<LogisticsShipment | null> {
    throw new Error('MRW connector not yet implemented — awaiting API access');
  }
}
