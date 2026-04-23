import { Router, Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';
import { logger } from './logger.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
} from './auth.js';
import { HoldedClient } from './holded-client.js';

export const oauthRouter: Router = Router();

function codeSecret() {
  return new TextEncoder().encode(config.OAUTH_JWT_SECRET);
}

/** Genera un auth code como JWT firmado (10 min, single-use semántico). */
async function createAuthCode(holdedApiKey: string): Promise<string> {
  return new SignJWT({ hak: holdedApiKey })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp-code')
    .sign(codeSecret());
}

/** Verifica y extrae el holdedApiKey del auth code JWT. */
async function consumeAuthCode(code: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(code, codeSecret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp-code',
    });
    return (payload['hak'] as string | undefined) ?? null;
  } catch {
    return null;
  }
}

// ── GET /oauth/authorize ─────────────────────────────────────────────────────
// Claude redirige al usuario aquí para iniciar el flujo OAuth
oauthRouter.get('/authorize', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state, response_type } = req.query;

  if (response_type !== 'code') {
    res.status(400).send('response_type debe ser "code"');
    return;
  }

  if (client_id !== config.OAUTH_CLIENT_ID) {
    res.status(400).send('client_id no reconocido');
    return;
  }

  // Sirve la página de consentimiento donde el usuario introduce su API key
  res.send(consentPage(String(redirect_uri ?? ''), String(state ?? '')));
});

// ── POST /oauth/authorize ────────────────────────────────────────────────────
// El usuario envía su API key de Holded; generamos un authorization code
oauthRouter.post('/authorize', async (req: Request, res: Response) => {
  const { holded_api_key, redirect_uri, state } = req.body;

  if (!holded_api_key || !redirect_uri) {
    res.status(400).json({ error: 'Faltan parámetros' });
    return;
  }

  // Validamos la API key contra Holded antes de continuar
  const client = new HoldedClient(holded_api_key);
  const valid = await client.validateApiKey();

  if (!valid) {
    res.status(400).send(consentPage(redirect_uri, state, true));
    return;
  }

  // Generamos un authorization code de un solo uso (10 minutos), firmado como JWT
  const code = await createAuthCode(holded_api_key);

  logger.info(`Authorization code generado`);

  const callbackUrl = new URL(redirect_uri);
  callbackUrl.searchParams.set('code', code);
  if (state) callbackUrl.searchParams.set('state', state);

  res.redirect(callbackUrl.toString());
});

// ── POST /oauth/token ────────────────────────────────────────────────────────
// Claude canjea el authorization code por access_token + refresh_token
oauthRouter.post('/token', async (req: Request, res: Response) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  // Verificar credenciales del cliente (Claude)
  if (client_id !== config.OAUTH_CLIENT_ID || client_secret !== config.OAUTH_CLIENT_SECRET) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  if (grant_type === 'authorization_code') {
    const holdedApiKey = await consumeAuthCode(code);
    if (!holdedApiKey) {
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'Código expirado o inválido' });
      return;
    }

    const [accessToken, refreshTokenStr] = await Promise.all([
      createAccessToken(holdedApiKey),
      createRefreshToken(holdedApiKey),
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

    const holdedApiKey = await verifyRefreshToken(refresh_token);
    if (!holdedApiKey) {
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'Refresh token expirado o inválido' });
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

// ── POST /oauth/revoke ───────────────────────────────────────────────────────
oauthRouter.post('/revoke', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(200).send(); // RFC 7009: siempre 200
    return;
  }
  const token = authHeader.slice(7);
  const record = await verifyAccessToken(token);
  if (record) await revokeToken(record.userId);
  res.status(200).send();
});

// ── Página de consentimiento HTML ────────────────────────────────────────────
function consentPage(redirectUri: string, state: string, error = false): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar Holded con Claude</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
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
    .scope::before { content: '✓ '; color: #1D9E75; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <img src="/logo.svg" alt="Holded" class="logo-img">
      <span class="arrow">↔</span>
      <img src="/claude.svg" alt="Claude" class="logo-img" onerror="this.style.display='none'">
    </div>
    <h1>Conectar Holded con Claude</h1>
    <p>Claude necesita acceder a tu cuenta de Holded para consultar tus datos y ayudarte con facturas, contactos, proyectos y contabilidad.</p>

    ${error ? '<div class="error">API key inválida o sin permisos. Comprueba que es correcta y que tu plan de Holded está activo.</div>' : ''}

    <div class="scopes">
      <div class="scope">Leer facturas, presupuestos y documentos</div>
      <div class="scope">Leer y buscar contactos y clientes</div>
      <div class="scope">Leer productos e inventario</div>
      <div class="scope">Leer proyectos y tareas</div>
      <div class="scope">Leer contabilidad y diario</div>
      <div class="scope">Crear borradores de factura (con tu confirmación)</div>
    </div>

    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state}">
      <label for="holded_api_key">Tu API key de Holded</label>
      <input type="password" id="holded_api_key" name="holded_api_key" placeholder="Pega aquí tu API key…" required autocomplete="off">
      <p class="hint">La encuentras en Holded → Ajustes → Desarrolladores. <a href="https://help.holded.com/en/articles/6896051" target="_blank" rel="noopener">¿Cómo generarla?</a></p>
      <button type="submit">Conectar Holded</button>
    </form>
    <p style="margin-top:20px;font-size:11px;color:#9ca3af;text-align:center;">
      Al conectar, aceptas el
      <a href="https://holded.verifactu.business/dpa" target="_blank" rel="noopener" style="color:#D97706;">Acuerdo de tratamiento de datos (DPA)</a>
      y la
      <a href="https://holded.verifactu.business/privacy" target="_blank" rel="noopener" style="color:#D97706;">Política de privacidad</a>.
      Documentación: <a href="https://holded.verifactu.business/docs/claude" target="_blank" rel="noopener" style="color:#D97706;">docs/claude</a>.
    </p>
  </div>
</body>
</html>`;
}
