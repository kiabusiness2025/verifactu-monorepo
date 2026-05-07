import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { HoldedClient } from './holded-client.js';
import { apiRateLimit, requireAuth, requestLogger } from './middleware/auth.js';
import { corsMiddleware } from './middleware/cors.js';
import { logger } from './logger.js';
import { oauthRouter } from './oauth-routes.js';
import { renderLandingPage } from './public-pages.js';
import { registerProductionTools } from './tools/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

export function createApp() {
  const app = express();

  // Trust proxy (Railway, Vercel, etc. set X-Forwarded-For)
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // ⚠️ ORDEN IMPORTANTE: las rutas de iconos van ANTES que express.static.
  // Si express.static corre primero, sirve los bytes históricos de
  // public/favicon.ico (la "V") y nuestras rutas nunca se ejecutan.

  // Holded diamond brand mark — TODAS las variantes PNG sirven el mismo
  // asset (apps/holded-mcp/public/holded-diamond-logo.png). Anteriormente
  // estas rutas devolvían holded-logo.svg con Content-Type image/svg+xml,
  // lo que provocaba que Claude y otros clientes mostraran un icono "V"
  // genérico en lugar del rombo de Holded.
  //
  // X-Icon-Version fuerza a Claude.ai y a proxies intermedios a tratar la
  // respuesta como nueva aunque tengan una copia en caché. El valor incluye
  // la fecha de la última regeneración del asset para facilitar la depuración.
  const ICON_VERSION = 'holded-diamond-2026-05-03';

  // ⚠️ Anthropic Connectors Directory fetchea el logo desde
  // https://www.google.com/s2/favicons?domain=claude.verifactu.business&sz=64
  // Si el server responde con no-cache, Google interpreta "no almacenar"
  // y sirve un placeholder gris en su lugar — el directorio mostraría gris.
  // Por eso cacheamos 1 día. ICON_VERSION sigue en el header para
  // depuración (Cmd+F en DevTools al asset).
  const ICON_CACHE = 'public, max-age=86400, immutable';

  const sendDiamondPng = (res: express.Response, contentType = 'image/png') => {
    res.set({
      'Cache-Control': ICON_CACHE,
      'Content-Type': contentType,
      'X-Icon-Version': ICON_VERSION,
    });
    res.sendFile(path.join(publicDir, 'holded-diamond-logo.png'));
  };

  const sendDiamondIco = (res: express.Response) => {
    res.set({
      'Cache-Control': ICON_CACHE,
      'Content-Type': 'image/x-icon',
      'X-Icon-Version': ICON_VERSION,
    });
    res.sendFile(path.join(publicDir, 'favicon.ico'));
  };

  // /favicon.ico — se sirve el ICO multi-resolución real (64/48/32/16 px)
  // con Content-Type: image/x-icon. El fichero tiene magic bytes ICO válidos
  // (00 00 01 00) y 4 frames, generados con:
  //   magick holded-diamond-logo.png -define icon:auto-resize=64,48,32,16 favicon.ico
  app.get('/favicon.ico', (_req, res) => sendDiamondIco(res));
  app.get('/favicon.png', (_req, res) => sendDiamondPng(res));
  app.get('/logo.png', (_req, res) => sendDiamondPng(res));
  app.get('/icon.png', (_req, res) => sendDiamondPng(res));
  app.get('/apple-touch-icon.png', (_req, res) => sendDiamondPng(res));
  app.get('/holded-diamond-logo.png', (_req, res) => sendDiamondPng(res));

  app.get('/icon.svg', (_req, res) => {
    res.set({
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'Content-Type': 'image/svg+xml',
    });
    res.sendFile(path.join(publicDir, 'holded-logo.svg'));
  });

  // Static después de los overrides para que /favicon.ico y otras rutas
  // de branding NO se sirvan desde public/ con bytes obsoletos.
  app.use(express.static(publicDir));

  // Claude landing — landing local del servidor MCP. Las páginas legales
  // y de documentación NO viven aquí: existen únicamente en la app Next.js
  // de holded.verifactu.business/conectores/claude/* para que haya una
  // sola fuente de verdad por conector.
  app.get('/', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(renderLandingPage(config.BASE_URL));
  });

  // /docs /privacy /dpa /terms /support /soporte — URLs referenciadas en el
  // formulario de Anthropic y en bookmarks de usuarios. Redirigen 301 a la
  // app Next.js, que es la única fuente de verdad para contenido legal/docs.
  const holdedBase = 'https://holded.verifactu.business/conectores/claude';
  app.get('/docs', (_req, res) => res.redirect(301, `${holdedBase}/docs`));
  app.get('/privacy', (_req, res) => res.redirect(301, `${holdedBase}/privacy`));
  app.get('/dpa', (_req, res) => res.redirect(301, `${holdedBase}/dpa`));
  app.get('/terms', (_req, res) => res.redirect(301, `${holdedBase}/terms`));
  app.get('/support', (_req, res) => res.redirect(301, `${holdedBase}/soporte`));
  app.get('/soporte', (_req, res) => res.redirect(301, `${holdedBase}/soporte`));

  app.use('/oauth', oauthRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'holded-mcp', version: '1.0.0' });
  });

  app.get('/.well-known/oauth-authorization-server', (_req, res) => {
    res.json({
      issuer: config.BASE_URL,
      authorization_endpoint: `${config.BASE_URL}/oauth/authorize`,
      token_endpoint: `${config.BASE_URL}/oauth/token`,
      revocation_endpoint: `${config.BASE_URL}/oauth/revoke`,
      registration_endpoint: `${config.BASE_URL}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      scopes_supported: ['holded:read', 'holded:write'],
      service_documentation: `${config.BASE_URL}/docs`,
      logo_uri: `${config.BASE_URL}/holded-diamond-logo.png?v=holded-diamond-2026-05-03`,
    });
  });

  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.json({
      resource: config.BASE_URL,
      authorization_servers: [config.BASE_URL],
      bearer_methods_supported: ['header'],
      scopes_supported: ['holded:read', 'holded:write'],
    });
  });

  app.post('/mcp', apiRateLimit, requireAuth, async (req, res) => {
    const record = req.holdedRecord!;
    const holdedClient = new HoldedClient(record.holdedApiKey);

    const mcpServer = new McpServer({
      name: 'holded-mcp',
      version: '1.0.0',
    });

    const getClient = () => holdedClient;
    // F5.3: pasamos contexto del token (userId real post-F3, channel='claude'
    // ya que este servidor MCP solo lo usa Claude Desktop) para que tools con
    // side-effect puedan disparar eventos al endpoint receptor de apps/holded.
    const getContext = () => ({
      userId: record.userId,
      channel: 'claude' as const,
    });
    registerProductionTools(mcpServer, getClient, getContext);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      transport.close();
      mcpServer.close();
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', apiRateLimit, requireAuth, async (_req, res) => {
    res.status(405).json({
      error: 'method_not_allowed',
      message: 'Este servidor MCP usa Streamable HTTP. Usa POST /mcp.',
    });
  });

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Error no capturado:', err);
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  );

  return app;
}

export function startServer() {
  const app = createApp();

  return app.listen(config.PORT, () => {
    logger.info(`Holded MCP Server arrancado en puerto ${config.PORT}`);
    logger.info(`   MCP endpoint: ${config.BASE_URL}/mcp`);
    logger.info(`   OAuth auth:   ${config.BASE_URL}/oauth/authorize`);
    logger.info(`   Discovery:    ${config.BASE_URL}/.well-known/oauth-authorization-server`);
  });
}
