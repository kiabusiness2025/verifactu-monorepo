import {
  applyOpenAiCorsHeaders,
  ensureScopesAllowed,
  getDefaultScopes,
  validateRedirectUri,
} from '@/lib/oauth/mcp';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type DynamicClientRegistrationRequest = {
  client_name?: unknown;
  redirect_uris?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
  token_endpoint_auth_method?: unknown;
  scope?: unknown;
  application_type?: unknown;
};

function normalizeRedirectUris(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeStringArray(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildClientId(redirectUris: string[]) {
  const digest = createHash('sha256')
    .update(redirectUris.sort().join('|'))
    .digest('hex')
    .slice(0, 24);

  return `openai-chatgpt-${digest}`;
}

function jsonWithCors(request: NextRequest, body: Record<string, unknown>, init?: ResponseInit) {
  return applyOpenAiCorsHeaders(NextResponse.json(body, init), request, {
    methods: ['OPTIONS', 'POST'],
    allowHeaders: ['content-type'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, {
      status: 204,
      headers: {
        Allow: 'OPTIONS, POST',
      },
    }),
    request,
    {
      methods: ['OPTIONS', 'POST'],
      allowHeaders: ['content-type'],
    }
  );
}

export async function POST(request: NextRequest) {
  let body: DynamicClientRegistrationRequest;

  try {
    body = (await request.json()) as DynamicClientRegistrationRequest;
  } catch {
    return jsonWithCors(request, { error: 'invalid_client_metadata' }, { status: 400 });
  }

  const redirectUris = normalizeRedirectUris(body.redirect_uris);
  const grantTypes = normalizeStringArray(body.grant_types);
  const responseTypes = normalizeStringArray(body.response_types);
  const clientName =
    typeof body.client_name === 'string' ? body.client_name.trim() : 'OpenAI ChatGPT';
  const tokenEndpointAuthMethod =
    typeof body.token_endpoint_auth_method === 'string'
      ? body.token_endpoint_auth_method.trim()
      : 'none';
  const requestedScope =
    typeof body.scope === 'string' && body.scope.trim()
      ? body.scope.trim()
      : getDefaultScopes().join(' ');
  const applicationType =
    typeof body.application_type === 'string' && body.application_type.trim()
      ? body.application_type.trim()
      : 'web';

  if (redirectUris.length === 0) {
    return jsonWithCors(
      request,
      {
        error: 'invalid_redirect_uri',
        error_description: 'At least one redirect URI is required.',
      },
      { status: 400 }
    );
  }

  if (!redirectUris.every((uri) => validateRedirectUri(uri))) {
    return jsonWithCors(
      request,
      {
        error: 'invalid_redirect_uri',
        error_description: 'One or more redirect URIs are not allowed.',
      },
      { status: 400 }
    );
  }

  if (grantTypes.length > 0 && !grantTypes.every((value) => value === 'authorization_code')) {
    return jsonWithCors(
      request,
      {
        error: 'invalid_client_metadata',
        error_description: 'Only authorization_code grant type is supported.',
      },
      { status: 400 }
    );
  }

  if (responseTypes.length > 0 && !responseTypes.every((value) => value === 'code')) {
    return jsonWithCors(
      request,
      {
        error: 'invalid_client_metadata',
        error_description: 'Only code response type is supported.',
      },
      { status: 400 }
    );
  }

  if (tokenEndpointAuthMethod && tokenEndpointAuthMethod !== 'none') {
    return jsonWithCors(
      request,
      {
        error: 'invalid_client_metadata',
        error_description: 'Only public clients without client_secret are supported.',
      },
      { status: 400 }
    );
  }

  if (!ensureScopesAllowed(requestedScope)) {
    return jsonWithCors(
      request,
      {
        error: 'invalid_scope',
        error_description: 'One or more requested scopes are not supported.',
      },
      { status: 400 }
    );
  }

  const issuedAt = Math.floor(Date.now() / 1000);

  return jsonWithCors(request, {
    client_id: buildClientId(redirectUris),
    client_id_issued_at: issuedAt,
    client_name: clientName,
    application_type: applicationType,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: requestedScope,
  });
}
