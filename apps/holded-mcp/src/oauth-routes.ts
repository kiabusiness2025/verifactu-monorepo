import { Router, Request, Response } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { createAccessToken, createRefreshToken, verifyAccessToken, revokeToken } from './auth.js';
import { HoldedClient } from './holded-client.js';

export const oauthRouter = Router();

// Estado temporal de códigos de autorización (en producción: Redis con TTL)
const authCodes = new Map<string, { holdedApiKey: string; expiresAt: number }>();

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

  // Generamos un authorization code de un solo uso (10 minutos)
  const code = crypto.randomUUID();
  authCodes.set(code, {
    holdedApiKey: holded_api_key,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  logger.info(`Authorization code generado → ${code.slice(0, 8)}…`);

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
    const entry = authCodes.get(code);
    if (!entry || Date.now() > entry.expiresAt) {
      authCodes.delete(code);
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'Código expirado o inválido' });
      return;
    }
    authCodes.delete(code); // Código de un solo uso

    const [accessToken, refreshTokenStr] = await Promise.all([
      createAccessToken(entry.holdedApiKey),
      createRefreshToken(entry.holdedApiKey),
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
    res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Refresh token no implementado aún — vuelve a autenticar',
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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f5f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 440px; width: 100%; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .logo-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    .logo { width: 40px; height: 40px; border-radius: 8px; background: #1D9E75; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; }
    .logo.claude { background: #D97706; }
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
      <div class="logo">H</div>
      <span class="arrow">↔</span>
      <div class="logo claude">C</div>
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
  </div>
</body>
</html>`;
}
