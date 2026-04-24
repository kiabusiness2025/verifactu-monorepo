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
import {
  renderDocsPage,
  renderPrivacyPage,
  renderSupportPage,
  renderTermsPage,
  renderLandingPage,
  renderDocsPageClaude,
  renderPrivacyPageClaude,
  renderDpaPageClaude,
} from './public-pages.js';
import { registerProductionTools } from './tools/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

export function createApp() {
  const app = express();

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

  app.use(express.static(publicDir));

  // Favicon with cache-busting headers
  app.get('/favicon.ico', (_req, res) => {
    res.set({
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'Content-Type': 'image/x-icon',
    });
    res.sendFile(path.join(publicDir, 'favicon.ico'));
  });
  app.get('/favicon.png', (_req, res) => {
    res.set({
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'Content-Type': 'image/svg+xml',
    });
    res.sendFile(path.join(publicDir, 'holded-logo.svg'));
  });
  app.get('/logo.png', (_req, res) => {
    res.set('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(publicDir, 'holded-logo.svg'));
  });
  app.get('/icon.png', (_req, res) => {
    res.set('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(publicDir, 'holded-logo.svg'));
  });
  app.get('/icon.svg', (_req, res) => {
    res.set('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(publicDir, 'holded-logo.svg'));
  });
  app.get('/apple-touch-icon.png', (_req, res) => {
    res.set('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(publicDir, 'holded-logo.svg'));
  });

  // Claude landing & documentation
  app.get('/', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(renderLandingPage(config.BASE_URL));
  });
  app.get('/docs', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDocsPageClaude(config.BASE_URL));
  });
  app.get('/privacy', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPrivacyPageClaude());
  });
  app.get('/dpa', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDpaPageClaude());
  });

  // Holded MCP documentation (for reference)
  app.get('/mcp-docs', (_req, res) => {
    res.type('html').send(renderDocsPage(config.BASE_URL));
  });
  app.get('/mcp-privacy', (_req, res) => {
    res.type('html').send(renderPrivacyPage());
  });
  app.get('/mcp-terms', (_req, res) => {
    res.type('html').send(renderTermsPage());
  });
  app.get('/mcp-support', (_req, res) => {
    res.type('html').send(renderSupportPage());
  });

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
