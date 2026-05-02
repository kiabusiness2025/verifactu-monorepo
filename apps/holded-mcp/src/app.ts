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
  const sendDiamondPng = (res: express.Response, contentType = 'image/png') => {
    res.set({
      // no-cache fuerza revalidación en cada request. Esto evita que Claude.ai
      // u otros clientes sirvan un icono obsoleto cacheado indefinidamente.
      'Cache-Control': 'no-cache',
      'Content-Type': contentType,
    });
    res.sendFile(path.join(publicDir, 'holded-diamond-logo.png'));
  };

  // /favicon.ico — public/favicon.ico eliminado del repo (era la "V" azul de
  // Verifactu). Esta ruta sirve el PNG del diamante de Holded como ICO.
  app.get('/favicon.ico', (_req, res) => sendDiamondPng(res, 'image/x-icon'));
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
    registerProductionTools(mcpServer, getClient);

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
