import process from 'node:process';
import { z } from 'zod';

try {
  process.loadEnvFile?.();
} catch {
  // Railway y los contenedores suelen inyectar variables directamente.
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  BASE_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  OAUTH_ALLOWED_REDIRECT_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  ALLOW_STATELESS_OAUTH_IN_PRODUCTION: z.enum(['0', '1']).default('0'),
  OAUTH_JWT_SECRET: z.string().min(32),
  OAUTH_DATA_ENCRYPTION_SECRET: z.string().min(32).optional(),
  OAUTH_AUTH_CODE_TTL_SECONDS: z.coerce.number().default(600),
  OAUTH_TOKEN_TTL_SECONDS: z.coerce.number().default(3600),
  OAUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().default(2592000),
  OAUTH_CLIENT_ID: z.string().min(1),
  OAUTH_CLIENT_SECRET: z.string().min(16),
  HOLDED_API_BASE: z.string().url().default('https://api.holded.com'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // F3 (Holded Connectors Unified Architecture): URL del backend `apps/app`
  // donde vive el endpoint común F1 `/api/integrations/holded/upsert-from-key`.
  // El consent screen de Claude lo usa para crear User+Tenant+Connection sin
  // duplicar lógica (single source of truth).
  VERIFACTU_APP_URL: z.string().url().default('https://app.verifactu.business'),
  // Token compartido (server-to-server) entre el MCP y `apps/app` para llamar
  // al endpoint F1. Si no se define, el MCP llamará sin auth header (válido si
  // el endpoint F1 está abierto, p.ej. detrás de Vercel rate-limit).
  VERIFACTU_APP_SHARED_SECRET: z.string().optional(),
  // T#50 Opción 2 — Bridge Claude OAuth → Firebase auth (apps/holded).
  // Compartido con apps/app y apps/holded en Vercel para verificar la cookie
  // `__session` (.verifactu.business, HS256). Si no está seteado, el bridge
  // queda desactivado y el consent screen sigue pidiendo email plano (legacy).
  SESSION_SECRET: z.string().min(16).optional(),
  // URL pública del Next.js de Holded donde vive `/auth/holded-direct`
  // (Firebase Google + magic link). Usado para redirect-bridge desde el
  // consent screen Claude cuando no hay sesión verificada.
  HOLDED_PUBLIC_URL: z.string().url().default('https://holded.verifactu.business'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Variables de entorno invalidas:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  if (
    result.data.NODE_ENV === 'production' &&
    !result.data.DATABASE_URL &&
    result.data.ALLOW_STATELESS_OAUTH_IN_PRODUCTION !== '1'
  ) {
    console.error(
      'DATABASE_URL is required in production for the Claude MCP OAuth store. Set ALLOW_STATELESS_OAUTH_IN_PRODUCTION=1 only for an emergency degraded rollout.'
    );
    process.exit(1);
  }

  if (result.data.NODE_ENV === 'production' && !result.data.SESSION_SECRET) {
    console.error(
      'SESSION_SECRET is required in production so Claude OAuth must bridge through verified Verifactu auth before consent.'
    );
    process.exit(1);
  }

  if (result.data.NODE_ENV === 'production' && !result.data.VERIFACTU_APP_SHARED_SECRET) {
    console.error(
      'VERIFACTU_APP_SHARED_SECRET is required in production so Claude OAuth can use the central Verifactu connection registry.'
    );
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
