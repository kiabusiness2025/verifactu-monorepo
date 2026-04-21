import type { NextRequest, NextResponse } from 'next/server';

export type HoldedConnectorEntryChannel = 'chatgpt' | 'dashboard';

const LEGACY_HOLDED_CONNECTOR_HEADERS = ['x-isaak-entry-channel', 'x-isaak-tenant-id'] as const;

export function resolveHoldedConnectorEntryChannel(
  request: NextRequest,
  options?: { allowQueryChannel?: boolean }
): HoldedConnectorEntryChannel {
  const queryChannel = options?.allowQueryChannel
    ? request.nextUrl.searchParams.get('channel')?.trim().toLowerCase()
    : null;
  const canonicalHeader = request.headers.get('x-holded-entry-channel')?.trim().toLowerCase();
  const legacyHeader = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  const candidate = queryChannel || canonicalHeader || legacyHeader;

  return candidate === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export function resolveHoldedConnectorTenantIdHint(request: NextRequest) {
  return (
    request.headers.get('x-holded-tenant-id')?.trim() ||
    request.headers.get('x-isaak-tenant-id')?.trim() ||
    request.nextUrl.searchParams.get('tenant_id')?.trim() ||
    null
  );
}

export function applyHoldedConnectorCompatibilityHeaders(
  response: NextResponse,
  request: NextRequest
) {
  const deprecatedHeaders = LEGACY_HOLDED_CONNECTOR_HEADERS.filter((header) =>
    request.headers.has(header)
  );

  if (deprecatedHeaders.length === 0) {
    return response;
  }

  response.headers.set('deprecation', 'true');
  response.headers.set('x-verifactu-compatibility-mode', 'legacy-isaak-headers');
  response.headers.set('x-verifactu-deprecated-headers', deprecatedHeaders.join(','));
  return response;
}
