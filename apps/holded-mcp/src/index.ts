import './config.js'; // valida .env al arrancar
import express from 'express';
import helmet from 'helmet';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { config } from './config.js';
import { logger } from './logger.js';
import { oauthRouter } from './oauth-routes.js';
import { verifyAccessToken } from './auth.js';
import { HoldedClient } from './holded-client.js';
import { requireAuth, apiRateLimit, requestLogger } from './middleware/auth.js';

import { registerInvoicingTools } from './tools/invoicing.js';
import {
  registerProductsTools,
  registerProjectsTools,
  registerAccountingTools,
  registerTeamTools,
  registerTreasuryTools,
} from './tools/other.js';
import { registerContactsTools } from './tools/contacts.js';

// ── Express app ──────────────────────────────────────────────────────────────

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── OAuth routes (sin autenticación Bearer, son públicas) ────────────────────
app.use('/oauth', oauthRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'holded-mcp', version: '1.0.0' });
});

// ── OAuth discovery (requerido por el directorio de Anthropic) ───────────────
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.json({
    issuer: config.BASE_URL,
    authorization_endpoint: `${config.BASE_URL}/oauth/authorize`,
    token_endpoint: `${config.BASE_URL}/oauth/token`,
    revocation_endpoint: `${config.BASE_URL}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    scopes_supported: ['holded:read', 'holded:write'],
  });
});

// ── MCP endpoint (requiere Bearer token válido) ───────────────────────────────
app.post('/mcp', apiRateLimit, requireAuth, async (req, res) => {
  // Obtenemos el record del usuario (contiene la API key de Holded)
  const record = req.holdedRecord!;
  const holdedClient = new HoldedClient(record.holdedApiKey);

  // Creamos una instancia de McpServer por petición (stateless)
  const mcpServer = new McpServer({
    name: 'holded-mcp',
    version: '1.0.0',
  });

  // Registramos todas las tools pasando el cliente ya autenticado
  const getClient = () => holdedClient;

  registerInvoicingTools(mcpServer, getClient);
  registerContactsTools(mcpServer, getClient);
  registerProductsTools(mcpServer, getClient);
  registerProjectsTools(mcpServer, getClient);
  registerAccountingTools(mcpServer, getClient);
  registerTeamTools(mcpServer, getClient);
  registerTreasuryTools(mcpServer, getClient);

  // Usamos Streamable HTTP transport (recomendado por Anthropic para nuevos servidores)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — sin sesiones persistentes
  });

  res.on('close', () => {
    transport.close();
    mcpServer.close();
  });

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ── GET /mcp — para SSE legacy (compatibilidad) ───────────────────────────────
app.get('/mcp', apiRateLimit, requireAuth, async (req, res) => {
  // Devuelve 405 con mensaje claro: este servidor usa Streamable HTTP
  res.status(405).json({
    error: 'method_not_allowed',
    message: 'Este servidor MCP usa Streamable HTTP. Usa POST /mcp.',
  });
});

// ── Error handler global ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error no capturado:', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  logger.info(`🚀 Holded MCP Server arrancado en puerto ${config.PORT}`);
  logger.info(`   MCP endpoint: ${config.BASE_URL}/mcp`);
  logger.info(`   OAuth auth:   ${config.BASE_URL}/oauth/authorize`);
  logger.info(`   Discovery:    ${config.BASE_URL}/.well-known/oauth-authorization-server`);
});

export default app;
