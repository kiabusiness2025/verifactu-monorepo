import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';
import { logger } from './logger.js';

export interface TokenRecord {
  userId: string;
  holdedApiKey: string;
  createdAt: number;
  expiresAt: number;
}

function secret() {
  return new TextEncoder().encode(config.OAUTH_JWT_SECRET);
}

/**
 * Creates a self-contained access token that embeds the Holded API key.
 * No server-side store needed — the token itself carries all state.
 */
export async function createAccessToken(holdedApiKey: string): Promise<string> {
  const userId = await hashApiKey(holdedApiKey);
  const now = Date.now();

  const token = await new SignJWT({
    sub: userId,
    hak: holdedApiKey, // holded api key — token is opaque to clients, travels over HTTPS
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.OAUTH_TOKEN_TTL_SECONDS}s`)
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp')
    .sign(secret());

  logger.info(`Token creado para usuario ${userId.slice(0, 8)}…`);
  return token;
}

/**
 * Creates a self-contained refresh token embedding the Holded API key.
 */
export async function createRefreshToken(holdedApiKey: string): Promise<string> {
  const userId = await hashApiKey(holdedApiKey);
  return new SignJWT({
    sub: userId,
    hak: holdedApiKey,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.OAUTH_REFRESH_TOKEN_TTL_SECONDS}s`)
    .setIssuer(config.BASE_URL)
    .sign(secret());
}

/**
 * Verifies an access token and extracts the TokenRecord.
 * Stateless — no in-memory store required.
 */
export async function verifyAccessToken(token: string): Promise<TokenRecord | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp',
    });

    const userId = payload.sub!;
    const holdedApiKey = payload['hak'] as string | undefined;
    if (!holdedApiKey) return null;

    const iat = (payload.iat ?? 0) * 1000;
    const exp = (payload.exp ?? 0) * 1000;

    return { userId, holdedApiKey, createdAt: iat, expiresAt: exp };
  } catch (err) {
    logger.debug('Token inválido:', err);
    return null;
  }
}

/**
 * Verifies a refresh token and returns the holdedApiKey.
 * Stateless — JWT expiry enforces TTL.
 */
export async function verifyRefreshToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: config.BASE_URL,
    });
    if (payload['type'] !== 'refresh') return null;
    return (payload['hak'] as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * Revocation is a no-op in stateless mode.
 * Tokens expire naturally. Add a Redis blocklist here if needed.
 */
export async function revokeToken(_userId: string): Promise<void> {
  logger.info(`revokeToken: token expirará de forma natural (modo stateless)`);
}

export async function hashApiKey(apiKey: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  return Buffer.from(buf).toString('hex');
}
