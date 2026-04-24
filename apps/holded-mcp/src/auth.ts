import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';
import { DbClient, execute, getDbPool, queryRows, withDbTransaction } from './db.js';
import { logger } from './logger.js';

const AUTHORIZATION_CODES_TABLE = 'holded_mcp_oauth_authorization_codes';
const ACCESS_TOKENS_TABLE = 'holded_mcp_oauth_access_tokens';
const REFRESH_TOKENS_TABLE = 'holded_mcp_oauth_refresh_tokens';

export interface TokenRecord {
  sessionId: string;
  userId: string;
  clientId: string;
  holdedApiKey: string;
  scope: string;
  createdAt: number;
  expiresAt: number;
  persistence: 'db' | 'stateless';
}

export interface AuthorizationCodePayload {
  holdedApiKey: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string | null;
  codeChallengeMethod: 'S256' | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresIn: number;
}

type DbAuthorizationCodeRow = {
  client_id: string;
  redirect_uri: string;
  holded_api_key_enc: string;
  scope: string;
  code_challenge: string | null;
  code_challenge_method: string | null;
};

type DbTokenRow = {
  session_id: string;
  user_id: string;
  client_id: string;
  holded_api_key_enc: string;
  scope: string;
  created_at: Date;
  expires_at: Date;
};

type DbRefreshTokenRow = DbTokenRow & {
  token_hash: string;
  revoked_at: Date | null;
};

type PersistentTokenPair = TokenPair & {
  refreshTokenHash: string;
};

let storeEnsured = false;
let statelessFallbackLogged = false;

function secret() {
  return new TextEncoder().encode(config.OAUTH_JWT_SECRET);
}

function encryptionKey() {
  return createHash('sha256')
    .update(config.OAUTH_DATA_ENCRYPTION_SECRET ?? config.OAUTH_JWT_SECRET)
    .digest();
}

function buildOpaqueTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

function encryptSensitiveValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const payload = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${payload.toString('base64url')}`;
}

function decryptSensitiveValue(value: string) {
  const [ivPart, tagPart, payloadPart] = value.split('.');
  if (!ivPart || !tagPart || !payloadPart) {
    throw new Error('Invalid encrypted OAuth payload');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function logStatelessFallback() {
  if (statelessFallbackLogged) {
    return;
  }

  statelessFallbackLogged = true;
  logger.warn(
    'Persistent OAuth store disabled: DATABASE_URL is not configured, using stateless fallback'
  );
}

function getPersistentClient() {
  const db = getDbPool();
  if (!db) {
    logStatelessFallback();
    return null;
  }

  return db;
}

async function ensurePersistentStore(client: DbClient) {
  if (storeEnsured) {
    return;
  }

  await execute(
    client,
    `
    CREATE TABLE IF NOT EXISTS ${AUTHORIZATION_CODES_TABLE} (
      code_hash text PRIMARY KEY,
      user_id text NOT NULL,
      client_id text NOT NULL,
      redirect_uri text NOT NULL,
      holded_api_key_enc text NOT NULL,
      scope text NOT NULL,
      code_challenge text,
      code_challenge_method text,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  );
  await execute(
    client,
    `
    CREATE INDEX IF NOT EXISTS ${AUTHORIZATION_CODES_TABLE}_expires_at_idx
    ON ${AUTHORIZATION_CODES_TABLE} (expires_at)
  `
  );
  await execute(
    client,
    `
    CREATE TABLE IF NOT EXISTS ${ACCESS_TOKENS_TABLE} (
      token_hash text PRIMARY KEY,
      session_id text NOT NULL,
      user_id text NOT NULL,
      client_id text NOT NULL,
      holded_api_key_enc text NOT NULL,
      scope text NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz
    )
  `
  );
  await execute(
    client,
    `
    CREATE INDEX IF NOT EXISTS ${ACCESS_TOKENS_TABLE}_session_id_idx
    ON ${ACCESS_TOKENS_TABLE} (session_id)
  `
  );
  await execute(
    client,
    `
    CREATE TABLE IF NOT EXISTS ${REFRESH_TOKENS_TABLE} (
      token_hash text PRIMARY KEY,
      session_id text NOT NULL,
      user_id text NOT NULL,
      client_id text NOT NULL,
      holded_api_key_enc text NOT NULL,
      scope text NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      replaced_by_token_hash text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz
    )
  `
  );
  await execute(
    client,
    `
    CREATE INDEX IF NOT EXISTS ${REFRESH_TOKENS_TABLE}_session_id_idx
    ON ${REFRESH_TOKENS_TABLE} (session_id)
  `
  );

  storeEnsured = true;
}

function mapDbTokenRow(row: DbTokenRow): TokenRecord {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    clientId: row.client_id,
    holdedApiKey: decryptSensitiveValue(row.holded_api_key_enc),
    scope: row.scope,
    createdAt: row.created_at.getTime(),
    expiresAt: row.expires_at.getTime(),
    persistence: 'db',
  };
}

async function issuePersistentTokenPair(
  client: DbClient,
  input: {
    sessionId: string;
    userId: string;
    clientId: string;
    holdedApiKey: string;
    scope: string;
  }
): Promise<PersistentTokenPair> {
  const accessToken = createOpaqueToken();
  const refreshToken = createOpaqueToken();
  const accessTokenHash = buildOpaqueTokenHash(accessToken);
  const refreshTokenHash = buildOpaqueTokenHash(refreshToken);
  const encryptedApiKey = encryptSensitiveValue(input.holdedApiKey);

  await execute(
    client,
    `
      INSERT INTO ${ACCESS_TOKENS_TABLE}
        (token_hash, session_id, user_id, client_id, holded_api_key_enc, scope, expires_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      accessTokenHash,
      input.sessionId,
      input.userId,
      input.clientId,
      encryptedApiKey,
      input.scope,
      new Date(Date.now() + config.OAUTH_TOKEN_TTL_SECONDS * 1000),
    ]
  );

  await execute(
    client,
    `
      INSERT INTO ${REFRESH_TOKENS_TABLE}
        (token_hash, session_id, user_id, client_id, holded_api_key_enc, scope, expires_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      refreshTokenHash,
      input.sessionId,
      input.userId,
      input.clientId,
      encryptedApiKey,
      input.scope,
      new Date(Date.now() + config.OAUTH_REFRESH_TOKEN_TTL_SECONDS * 1000),
    ]
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    scope: input.scope,
    expiresIn: config.OAUTH_TOKEN_TTL_SECONDS,
  };
}

export function isValidPkceCodeChallenge(codeChallenge: string) {
  return /^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge);
}

export function isValidPkceCodeVerifier(codeVerifier: string) {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier);
}

export function verifyPkceCodeVerifier(codeVerifier: string, codeChallenge: string) {
  return createHash('sha256').update(codeVerifier).digest('base64url') === codeChallenge;
}

export async function createAuthorizationCode(input: AuthorizationCodePayload): Promise<string> {
  const prisma = getPersistentClient();
  if (prisma) {
    await ensurePersistentStore(prisma);

    const code = createOpaqueToken();
    await execute(
      prisma,
      `
        INSERT INTO ${AUTHORIZATION_CODES_TABLE}
          (code_hash, user_id, client_id, redirect_uri, holded_api_key_enc, scope, code_challenge, code_challenge_method, expires_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        buildOpaqueTokenHash(code),
        await hashApiKey(input.holdedApiKey),
        input.clientId,
        input.redirectUri,
        encryptSensitiveValue(input.holdedApiKey),
        input.scope,
        input.codeChallenge,
        input.codeChallengeMethod,
        new Date(Date.now() + config.OAUTH_AUTH_CODE_TTL_SECONDS * 1000),
      ]
    );

    return code;
  }

  return new SignJWT({
    hak: input.holdedApiKey,
    cid: input.clientId,
    ru: input.redirectUri,
    scp: input.scope,
    cc: input.codeChallenge,
    ccm: input.codeChallengeMethod,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.OAUTH_AUTH_CODE_TTL_SECONDS}s`)
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp-code')
    .sign(secret());
}

export async function consumeAuthorizationCode(
  code: string
): Promise<AuthorizationCodePayload | null> {
  const prisma = getPersistentClient();
  if (prisma) {
    await ensurePersistentStore(prisma);

    const rows = await withDbTransaction(async (tx) => {
      await ensurePersistentStore(tx);

      return queryRows<DbAuthorizationCodeRow>(
        tx,
        `
          UPDATE ${AUTHORIZATION_CODES_TABLE}
          SET consumed_at = now()
          WHERE code_hash = $1
            AND consumed_at IS NULL
            AND expires_at > now()
          RETURNING client_id, redirect_uri, holded_api_key_enc, scope, code_challenge, code_challenge_method
        `,
        [buildOpaqueTokenHash(code)]
      );
    });

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      holdedApiKey: decryptSensitiveValue(row.holded_api_key_enc),
      clientId: row.client_id,
      redirectUri: row.redirect_uri,
      scope: row.scope,
      codeChallenge: row.code_challenge,
      codeChallengeMethod: row.code_challenge_method === 'S256' ? 'S256' : null,
    };
  }

  try {
    const { payload } = await jwtVerify(code, secret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp-code',
    });

    const holdedApiKey = payload['hak'];
    const clientId = payload['cid'];
    const redirectUri = payload['ru'];
    const scope = payload['scp'];
    const codeChallenge = payload['cc'];
    const codeChallengeMethod = payload['ccm'];

    if (
      typeof holdedApiKey !== 'string' ||
      typeof clientId !== 'string' ||
      typeof redirectUri !== 'string'
    ) {
      return null;
    }

    return {
      holdedApiKey,
      clientId,
      redirectUri,
      scope: typeof scope === 'string' && scope.trim() ? scope : 'holded:read holded:write',
      codeChallenge: typeof codeChallenge === 'string' ? codeChallenge : null,
      codeChallengeMethod: codeChallengeMethod === 'S256' ? 'S256' : null,
    };
  } catch {
    return null;
  }
}

export async function createTokenPair(input: {
  holdedApiKey: string;
  clientId: string;
  scope: string;
}): Promise<TokenPair> {
  const prisma = getPersistentClient();
  const userId = await hashApiKey(input.holdedApiKey);

  if (prisma) {
    await ensurePersistentStore(prisma);

    const pair = await withDbTransaction(async (tx) => {
      await ensurePersistentStore(tx);
      return issuePersistentTokenPair(tx, {
        sessionId: randomUUID(),
        userId,
        clientId: input.clientId,
        holdedApiKey: input.holdedApiKey,
        scope: input.scope,
      });
    });

    return pair;
  }

  const sessionId = randomUUID();
  const [accessToken, refreshToken] = await Promise.all([
    new SignJWT({
      sub: userId,
      cid: input.clientId,
      hak: input.holdedApiKey,
      scp: input.scope,
      sid: sessionId,
      typ: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${config.OAUTH_TOKEN_TTL_SECONDS}s`)
      .setIssuer(config.BASE_URL)
      .setAudience('holded-mcp')
      .sign(secret()),
    new SignJWT({
      sub: userId,
      cid: input.clientId,
      hak: input.holdedApiKey,
      scp: input.scope,
      sid: sessionId,
      typ: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${config.OAUTH_REFRESH_TOKEN_TTL_SECONDS}s`)
      .setIssuer(config.BASE_URL)
      .setAudience('holded-mcp-refresh')
      .sign(secret()),
  ]);

  return {
    accessToken,
    refreshToken,
    scope: input.scope,
    expiresIn: config.OAUTH_TOKEN_TTL_SECONDS,
  };
}

export async function verifyAccessToken(token: string): Promise<TokenRecord | null> {
  const prisma = getPersistentClient();
  if (prisma) {
    await ensurePersistentStore(prisma);

    const rows = await queryRows<DbTokenRow>(
      prisma,
      `
        SELECT session_id, user_id, client_id, holded_api_key_enc, scope, created_at, expires_at
        FROM ${ACCESS_TOKENS_TABLE}
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > now()
        LIMIT 1
      `,
      [buildOpaqueTokenHash(token)]
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    execute(
      prisma,
      `
          UPDATE ${ACCESS_TOKENS_TABLE}
          SET last_used_at = now()
          WHERE token_hash = $1
        `,
      [buildOpaqueTokenHash(token)]
    ).catch(() => {});

    return mapDbTokenRow(row);
  }

  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp',
    });

    const userId = payload.sub;
    const clientId = payload['cid'];
    const holdedApiKey = payload['hak'];
    const scope = payload['scp'];
    const sessionId = payload['sid'];

    if (
      typeof userId !== 'string' ||
      typeof clientId !== 'string' ||
      typeof holdedApiKey !== 'string' ||
      typeof sessionId !== 'string'
    ) {
      return null;
    }

    return {
      sessionId,
      userId,
      clientId,
      holdedApiKey,
      scope: typeof scope === 'string' && scope.trim() ? scope : 'holded:read holded:write',
      createdAt: (payload.iat ?? 0) * 1000,
      expiresAt: (payload.exp ?? 0) * 1000,
      persistence: 'stateless',
    };
  } catch {
    return null;
  }
}

export async function rotateRefreshToken(
  refreshToken: string,
  clientId: string
): Promise<TokenPair | null> {
  const prisma = getPersistentClient();
  if (prisma) {
    await ensurePersistentStore(prisma);

    return withDbTransaction(async (tx) => {
      await ensurePersistentStore(tx);

      const rows = await queryRows<DbRefreshTokenRow>(
        tx,
        `
          SELECT token_hash, session_id, user_id, client_id, holded_api_key_enc, scope, created_at, expires_at, revoked_at
          FROM ${REFRESH_TOKENS_TABLE}
          WHERE token_hash = $1
          FOR UPDATE
        `,
        [buildOpaqueTokenHash(refreshToken)]
      );

      const current = rows[0];
      if (
        !current ||
        current.client_id !== clientId ||
        current.revoked_at ||
        current.expires_at.getTime() <= Date.now()
      ) {
        return null;
      }

      await execute(
        tx,
        `
          UPDATE ${ACCESS_TOKENS_TABLE}
          SET revoked_at = now()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [current.session_id]
      );

      const pair = await issuePersistentTokenPair(tx, {
        sessionId: current.session_id,
        userId: current.user_id,
        clientId: current.client_id,
        holdedApiKey: decryptSensitiveValue(current.holded_api_key_enc),
        scope: current.scope,
      });

      await execute(
        tx,
        `
          UPDATE ${REFRESH_TOKENS_TABLE}
          SET revoked_at = now(), replaced_by_token_hash = $2, last_used_at = now()
          WHERE token_hash = $1
        `,
        [current.token_hash, pair.refreshTokenHash]
      );

      return pair;
    });
  }

  try {
    const { payload } = await jwtVerify(refreshToken, secret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp-refresh',
    });

    if (payload['typ'] !== 'refresh') {
      return null;
    }

    const holdedApiKey = payload['hak'];
    const tokenClientId = payload['cid'];
    const scope = payload['scp'];

    if (
      typeof holdedApiKey !== 'string' ||
      typeof tokenClientId !== 'string' ||
      tokenClientId !== clientId
    ) {
      return null;
    }

    return createTokenPair({
      holdedApiKey,
      clientId: tokenClientId,
      scope: typeof scope === 'string' && scope.trim() ? scope : 'holded:read holded:write',
    });
  } catch {
    return null;
  }
}

export async function revokeToken(record: TokenRecord): Promise<void> {
  const prisma = getPersistentClient();
  if (prisma && record.persistence === 'db') {
    await ensurePersistentStore(prisma);

    await withDbTransaction(async (tx) => {
      await ensurePersistentStore(tx);

      await execute(
        tx,
        `
          UPDATE ${ACCESS_TOKENS_TABLE}
          SET revoked_at = now()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [record.sessionId]
      );
      await execute(
        tx,
        `
          UPDATE ${REFRESH_TOKENS_TABLE}
          SET revoked_at = now()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [record.sessionId]
      );
    });

    return;
  }

  logger.info(`Stateless revoke requested for user ${record.userId.slice(0, 8)}...`);
}

export async function revokeTokenValue(token: string): Promise<void> {
  const prisma = getPersistentClient();
  if (prisma) {
    await ensurePersistentStore(prisma);

    const tokenHash = buildOpaqueTokenHash(token);
    await withDbTransaction(async (tx) => {
      await ensurePersistentStore(tx);

      const sessionRows = await queryRows<{ session_id: string }>(
        tx,
        `
          SELECT session_id
          FROM ${ACCESS_TOKENS_TABLE}
          WHERE token_hash = $1
          UNION
          SELECT session_id
          FROM ${REFRESH_TOKENS_TABLE}
          WHERE token_hash = $1
          LIMIT 1
        `,
        [tokenHash]
      );

      const sessionId = sessionRows[0]?.session_id;
      if (!sessionId) {
        return;
      }

      await execute(
        tx,
        `
          UPDATE ${ACCESS_TOKENS_TABLE}
          SET revoked_at = now()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [sessionId]
      );
      await execute(
        tx,
        `
          UPDATE ${REFRESH_TOKENS_TABLE}
          SET revoked_at = now()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [sessionId]
      );
    });

    return;
  }

  const record = await verifyAccessToken(token);
  if (record) {
    await revokeToken(record);
  }
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return createHash('sha256').update(apiKey).digest('hex');
}
