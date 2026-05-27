// Correos Express logistics adapter — stub pending API access.
// API docs: https://www.correosexpress.com/web/correosexpress/envios/herramientas-soporte/api-web-services
// Auth: API key + customer code. Base URL: https://api.correosexpress.com/

import type { ListShipmentsParams, LogisticsClient, LogisticsShipment } from './logistics-client';

export class CorreosLogisticsClient implements LogisticsClient {
  readonly provider = 'correos' as const;

  constructor(private readonly _apiKey: string) {}

  listShipments(_params?: ListShipmentsParams): Promise<LogisticsShipment[]> {
    throw new Error('Correos Express connector not yet implemented — awaiting API access');
  }
  trackShipment(_trackingNumber: string): Promise<LogisticsShipment | null> {
    throw new Error('Correos Express connector not yet implemented — awaiting API access');
  }
}
