import { Request, Response, Router } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';
import { logger } from './logger.js';
import {
  createAccessToken,
  createRefreshToken,
  revokeToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './auth.js';
import { HoldedClient } from './holded-client.js';

export const oauthRouter: Router = Router();

interface ClientRecord {
  clientId: string;
  redirectUris: string[];
}

interface AuthCodePayload {
  holdedApiKey: string;
  clientId: string;
  redirectUri: string;
}

interface AuthorizeContext {
  clientId: string;
  redirectUri: string;
  state: string;
}

function codeSecret() {
  return new TextEncoder().encode(config.OAUTH_JWT_SECRET);
}

async function createDynamicClientSecret(
  clientId: string,
  redirectUris: string[]
): Promise<string> {
  return new SignJWT({
    cid: clientId,
    rus: redirectUris,
    type: 'client_secret',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp-client')
    .sign(codeSecret());
}

async function verifyClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<ClientRecord | null> {
  if (clientId === config.OAUTH_CLIENT_ID && clientSecret === config.OAUTH_CLIENT_SECRET) {
    return { clientId, redirectUris: [] };
  }

  try {
    const { payload } = await jwtVerify(clientSecret, codeSecret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp-client',
    });

    if (payload['type'] !== 'client_secret') return null;
    if (payload['cid'] !== clientId) return null;

    const redirectUris = Array.isArray(payload['rus'])
      ? payload['rus'].filter((value): value is string => typeof value === 'string')
      : [];

    return { clientId, redirectUris };
  } catch {
    return null;
  }
}

async function createAuthCode(payload: AuthCodePayload): Promise<string> {
  return new SignJWT({
    hak: payload.holdedApiKey,
    cid: payload.clientId,
    ru: payload.redirectUri,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp-code')
    .sign(codeSecret());
}

async function consumeAuthCode(code: string): Promise<AuthCodePayload | null> {
  try {
    const { payload } = await jwtVerify(code, codeSecret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp-code',
    });

    const holdedApiKey = payload['hak'];
    const clientId = payload['cid'];
    const redirectUri = payload['ru'];

    if (
      typeof holdedApiKey !== 'string' ||
      typeof clientId !== 'string' ||
      typeof redirectUri !== 'string'
    ) {
      return null;
    }

    return {
      holdedApiKey,
      clientId,
      redirectUri,
    };
  } catch {
    return null;
  }
}

function resolveAuthorizeContext(req: Request): AuthorizeContext | null {
  const bodyClientId =
    typeof req.body?.client_id === 'string' && req.body.client_id.length > 0
      ? req.body.client_id
      : null;
  const bodyRedirectUri =
    typeof req.body?.redirect_uri === 'string' && req.body.redirect_uri.length > 0
      ? req.body.redirect_uri
      : null;
  const bodyState = typeof req.body?.state === 'string' ? req.body.state : '';
  const queryClientId =
    typeof req.query?.client_id === 'string' && req.query.client_id.length > 0
      ? req.query.client_id
      : null;
  const queryRedirectUri =
    typeof req.query?.redirect_uri === 'string' && req.query.redirect_uri.length > 0
      ? req.query.redirect_uri
      : null;
  const queryState = typeof req.query?.state === 'string' ? req.query.state : '';

  if (bodyClientId && bodyRedirectUri) {
    return {
      clientId: bodyClientId,
      redirectUri: bodyRedirectUri,
      state: bodyState,
    };
  }

  if (queryClientId && queryRedirectUri) {
    return {
      clientId: queryClientId,
      redirectUri: queryRedirectUri,
      state: bodyState || queryState,
    };
  }

  const referer = req.get('referer');
  if (!referer) return null;

  try {
    const refererUrl = new URL(referer);
    const refererClientId = refererUrl.searchParams.get('client_id');
    const refererRedirectUri = refererUrl.searchParams.get('redirect_uri');
    const refererState = refererUrl.searchParams.get('state') ?? '';

    if (!refererClientId || !refererRedirectUri) {
      return null;
    }

    return {
      clientId: refererClientId,
      redirectUri: refererRedirectUri,
      state: bodyState || refererState,
    };
  } catch {
    return null;
  }
}

oauthRouter.post('/register', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const { redirect_uris, client_name } = req.body;

  const redirectUris = Array.isArray(redirect_uris)
    ? redirect_uris.filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      )
    : [];

  if (redirectUris.length === 0) {
    res.status(400).json({
      error: 'invalid_client_metadata',
      error_description: 'redirect_uris requerido',
    });
    return;
  }

  const clientId = `holded-mcp-${crypto.randomUUID()}`;
  const clientSecret = await createDynamicClientSecret(clientId, redirectUris);

  logger.info(`Cliente registrado: ${client_name ?? 'unknown'} (${clientId})`);

  res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
  });
});

oauthRouter.get('/authorize', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state, response_type } = req.query;
  res.set('Cache-Control', 'no-store');

  if (response_type !== 'code') {
    res.status(400).send('response_type debe ser "code"');
    return;
  }

  if (!client_id || !redirect_uri) {
    res.status(400).send('client_id y redirect_uri son obligatorios.');
    return;
  }

  res.send(consentPage(String(client_id), String(redirect_uri), String(state ?? '')));
});

oauthRouter.post('/authorize', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const holdedApiKey = typeof req.body?.holded_api_key === 'string' ? req.body.holded_api_key : '';
  const authorizeContext = resolveAuthorizeContext(req);

  if (!holdedApiKey || !authorizeContext) {
    logger.warn('POST /oauth/authorize sin contexto suficiente', {
      hasHoldedApiKey: holdedApiKey.length > 0,
      hasBodyClientId: typeof req.body?.client_id === 'string' && req.body.client_id.length > 0,
      hasBodyRedirectUri:
        typeof req.body?.redirect_uri === 'string' && req.body.redirect_uri.length > 0,
      hasQueryClientId: typeof req.query?.client_id === 'string' && req.query.client_id.length > 0,
      hasQueryRedirectUri:
        typeof req.query?.redirect_uri === 'string' && req.query.redirect_uri.length > 0,
      hasReferer: Boolean(req.get('referer')),
      contentType: req.get('content-type') ?? '',
    });
    res.status(400).json({ error: 'Faltan parametros' });
    return;
  }

  const client = new HoldedClient(holdedApiKey);
  const valid = await client.validateApiKey();

  if (!valid) {
    res
      .status(400)
      .send(
        consentPage(
          authorizeContext.clientId,
          authorizeContext.redirectUri,
          authorizeContext.state,
          true
        )
      );
    return;
  }

  const code = await createAuthCode({
    holdedApiKey,
    clientId: authorizeContext.clientId,
    redirectUri: authorizeContext.redirectUri,
  });
  logger.info(`Authorization code generado para ${authorizeContext.clientId}`);

  const callbackUrl = new URL(authorizeContext.redirectUri);
  callbackUrl.searchParams.set('code', code);
  if (authorizeContext.state) {
    callbackUrl.searchParams.set('state', authorizeContext.state);
  }

  res.redirect(callbackUrl.toString());
});

oauthRouter.post('/token', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

  const clientId = String(client_id ?? '');
  const clientSecret = String(client_secret ?? '');
  const clientRecord = await verifyClientCredentials(clientId, clientSecret);

  if (!clientRecord) {
    res.status(401).json({
      error: 'invalid_client',
      error_description: 'Cliente OAuth invalido',
    });
    return;
  }

  if (grant_type === 'authorization_code') {
    const authCodePayload = await consumeAuthCode(String(code ?? ''));
    if (!authCodePayload) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Codigo expirado o invalido',
      });
      return;
    }

    if (authCodePayload.clientId !== clientRecord.clientId) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'El codigo no pertenece a este cliente OAuth',
      });
      return;
    }

    if (
      clientRecord.redirectUris.length > 0 &&
      !clientRecord.redirectUris.includes(authCodePayload.redirectUri)
    ) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri no autorizado para este cliente',
      });
      return;
    }

    if (redirect_uri && authCodePayload.redirectUri !== String(redirect_uri)) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri no coincide con el codigo de autorizacion',
      });
      return;
    }

    const [accessToken, refreshTokenStr] = await Promise.all([
      createAccessToken(authCodePayload.holdedApiKey),
      createRefreshToken(authCodePayload.holdedApiKey),
    ]);

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: config.OAUTH_TOKEN_TTL_SECONDS,
      refresh_token: refreshTokenStr,
      scope: 'holded:read holded:write',
    });
    return;
  }

  if (grant_type === 'refresh_token') {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Falta refresh_token' });
      return;
    }

    const holdedApiKey = await verifyRefreshToken(String(refresh_token));
    if (!holdedApiKey) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Refresh token expirado o invalido',
      });
      return;
    }

    const [newAccessToken, newRefreshToken] = await Promise.all([
      createAccessToken(holdedApiKey),
      createRefreshToken(holdedApiKey),
    ]);

    res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: config.OAUTH_TOKEN_TTL_SECONDS,
      refresh_token: newRefreshToken,
      scope: 'holded:read holded:write',
    });
    return;
  }

  res.status(400).json({ error: 'unsupported_grant_type' });
});

oauthRouter.post('/revoke', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(200).send();
    return;
  }

  const token = authHeader.slice(7);
  const record = await verifyAccessToken(token);
  if (record) await revokeToken(record.userId);
  res.status(200).send();
});

function consentPage(clientId: string, redirectUri: string, state: string, error = false): string {
  const actionUrl = new URL('/oauth/authorize', config.BASE_URL);
  actionUrl.searchParams.set('client_id', clientId);
  actionUrl.searchParams.set('redirect_uri', redirectUri);
  if (state) actionUrl.searchParams.set('state', state);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar Holded con Claude</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/holded-diamond-logo.png">
  <link rel="mask-icon" href="/logo.svg" color="#ff5454">
  <meta property="og:image" content="/holded-diamond-logo.png">
  <meta name="twitter:image" content="/holded-diamond-logo.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f5f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 440px; width: 100%; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .logo-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    .logo-img { width: 40px; height: 40px; object-fit: contain; }
    .arrow { color: #9ca3af; font-size: 20px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #111; }
    p { color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: monospace; margin-bottom: 6px; }
    input:focus { outline: none; border-color: #1D9E75; box-shadow: 0 0 0 3px rgba(29,158,117,0.12); }
    .hint { font-size: 12px; color: #9ca3af; margin-bottom: 20px; }
    .hint a { color: #1D9E75; text-decoration: none; }
    button { width: 100%; padding: 11px; background: #1D9E75; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
    button:hover { background: #0F6E56; }
    .error { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .scopes { background: #f9fafb; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    .scope { font-size: 13px; color: #374151; padding: 3px 0; }
    .scope::before { content: '\\2713 '; color: #1D9E75; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <img src="/holded-diamond-logo.png" alt="Holded" class="logo-img">
      <span class="arrow">&harr;</span>
      <img src="/claude.svg" alt="Claude" class="logo-img">
    </div>
    <h1>Conectar Holded con Claude</h1>
    <p>Claude necesita acceder a tu cuenta de Holded para consultar tus datos y ayudarte con facturas, contactos, proyectos y contabilidad.</p>

    ${error ? '<div class="error">API key invalida o sin permisos. Comprueba que es correcta y que tu plan de Holded esta activo.</div>' : ''}

    <div class="scopes">
      <div class="scope">Leer facturas, presupuestos y documentos</div>
      <div class="scope">Leer y buscar contactos y clientes</div>
      <div class="scope">Leer productos e inventario</div>
      <div class="scope">Leer proyectos y tareas</div>
      <div class="scope">Leer contabilidad y diario</div>
      <div class="scope">Crear borradores de factura (con tu confirmacion)</div>
    </div>

    <form method="POST" action="${actionUrl.toString()}">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state}">
      <label for="holded_api_key">Tu API key de Holded</label>
      <input type="password" id="holded_api_key" name="holded_api_key" placeholder="Pega aqui tu API key..." required autocomplete="off">
      <p class="hint">La encuentras en Holded &rarr; Ajustes &rarr; Desarrolladores. <a href="https://help.holded.com/en/articles/6896051" target="_blank" rel="noopener">&iquest;Como generarla?</a></p>
      <button type="submit">Conectar Holded</button>
    </form>
    <p style="margin-top:20px;font-size:11px;color:#9ca3af;text-align:center;">
      Al conectar, aceptas el
      <a href="https://holded.verifactu.business/dpa" target="_blank" rel="noopener" style="color:#D97706;">Acuerdo de tratamiento de datos</a>
      y la
      <a href="https://holded.verifactu.business/privacy" target="_blank" rel="noopener" style="color:#D97706;">Politica de privacidad</a>.
    </p>
  </div>
</body>
</html>`;
}
