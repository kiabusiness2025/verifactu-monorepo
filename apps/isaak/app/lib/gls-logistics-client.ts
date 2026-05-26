// GLS Spain logistics adapter — stub pending API access.
// API docs: https://gls-group.eu/ES/es/herramientas-y-servicios/herramientas-de-integracion
// Auth: Username + password (Basic). Base URL: https://api.gls-spain.es/

import type { ListShipmentsParams, LogisticsClient, LogisticsShipment } from './logistics-client';

export class GlsLogisticsClient implements LogisticsClient {
  readonly provider = 'gls' as const;

  constructor(private readonly _apiKey: string) {}

  listShipments(_params?: ListShipmentsParams): Promise<LogisticsShipment[]> {
    throw new Error('GLS connector not yet implemented — awaiting API access');
  }
  trackShipment(_trackingNumber: string): Promise<LogisticsShipment | null> {
    throw new Error('GLS connector not yet implemented — awaiting API access');
  }
}
