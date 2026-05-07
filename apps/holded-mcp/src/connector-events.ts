/**
 * F5.3 — helper que dispara eventos operativos al endpoint receptor de
 * apps/holded:
 *   POST {VERIFACTU_APP_URL}/api/integrations/holded/connector-event
 *
 * Modo fire-and-forget: si la red falla, lo logueamos pero no degradamos el
 * tool/flujo principal. La idea es que estos emails son "best effort" — si no
 * se manda no se rompe nada del MCP.
 */

import { config } from './config.js';
import { logger } from './logger.js';

type ConnectorEventChannel = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';

interface BaseEvent {
  tenantId: string;
  userEmail: string;
  channel: ConnectorEventChannel;
  detectedAt?: string;
}

export interface FirstActivityEvent extends BaseEvent {
  type: 'first_activity';
  toolUsed?: string | null;
}

export interface InvoiceDraftCreatedEvent extends BaseEvent {
  type: 'invoice_draft_created';
  draftId?: string | null;
  draftNumber?: string | null;
  contactName?: string | null;
  total?: number | null;
  currency?: string | null;
}

export interface AuthFailuresBurstEvent extends BaseEvent {
  type: 'auth_failures_burst';
  userName?: string | null;
  failureCount: number;
  windowMinutes: number;
}

export type ConnectorEvent = FirstActivityEvent | InvoiceDraftCreatedEvent | AuthFailuresBurstEvent;

const ENDPOINT_PATH = '/api/integrations/holded/connector-event';
const TIMEOUT_MS = 5000;

export async function dispatchConnectorEvent(event: ConnectorEvent): Promise<void> {
  if (!config.VERIFACTU_APP_URL) {
    logger.debug('connector-event skipped: VERIFACTU_APP_URL not configured');
    return;
  }

  const url = new URL(ENDPOINT_PATH, config.VERIFACTU_APP_URL).toString();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.VERIFACTU_APP_SHARED_SECRET) {
    headers['x-verifactu-shared-secret'] = config.VERIFACTU_APP_SHARED_SECRET;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      logger.warn(`connector-event ${event.type} returned ${response.status}`);
    }
  } catch (err) {
    logger.warn(
      `connector-event ${event.type} dispatch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Llamada fire-and-forget que no espera el resultado. Usar desde flujos donde
 * no podemos bloquear la respuesta principal (verify token, tool execution).
 */
export function dispatchConnectorEventBackground(event: ConnectorEvent): void {
  dispatchConnectorEvent(event).catch((err) => {
    logger.warn(
      `connector-event background dispatch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  });
}
