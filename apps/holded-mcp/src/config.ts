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
  DATABASE_URL: z.string().url().optional(),
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
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Variables de entorno invalidas:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
