import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';
import { logger } from './logger.js';

// En producción usa Redis o PostgreSQL en lugar de Map en memoria
const tokenStore = new Map<string, TokenRecord>();

export interface TokenRecord {
  userId: string; // hash del API key — no guardamos el key en claro aquí
  holdedApiKey: string; // la API key real de Holded del usuario
  createdAt: number;
  expiresAt: number;
}

function secret() {
  return new TextEncoder().encode(config.OAUTH_JWT_SECRET);
}

export async function createAccessToken(holdedApiKey: string): Promise<string> {
  // Usamos el SHA-256 del API key como userId estable y anónimo
  const userId = await hashApiKey(holdedApiKey);

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.OAUTH_TOKEN_TTL_SECONDS}s`)
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp')
    .sign(secret());

  // Guardamos la asociación token ↔ API key
  tokenStore.set(userId, {
    userId,
    holdedApiKey,
    createdAt: Date.now(),
    expiresAt: Date.now() + config.OAUTH_TOKEN_TTL_SECONDS * 1000,
  });

  logger.info(`Token creado para usuario ${userId.slice(0, 8)}…`);
  return token;
}

export async function createRefreshToken(holdedApiKey: string): Promise<string> {
  const userId = await hashApiKey(holdedApiKey);
  return new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.OAUTH_REFRESH_TOKEN_TTL_SECONDS}s`)
    .setIssuer(config.BASE_URL)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<TokenRecord | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp',
    });
    const userId = payload.sub!;
    const record = tokenStore.get(userId);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      tokenStore.delete(userId);
      return null;
    }
    return record;
  } catch (err) {
    logger.debug('Token inválido:', err);
    return null;
  }
}

export async function revokeToken(userId: string): Promise<void> {
  tokenStore.delete(userId);
  logger.info(`Token revocado para usuario ${userId.slice(0, 8)}…`);
}

async function hashApiKey(apiKey: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  return Buffer.from(buf).toString('hex');
}
