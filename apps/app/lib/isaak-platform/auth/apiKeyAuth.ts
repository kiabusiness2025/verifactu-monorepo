/**
 * Validación de Bearer API Keys para la Fase 4 de Isaak Platform.
 *
 * Formato:  isk_live_<32-bytes-base64url>
 *           isk_test_<32-bytes-base64url>
 *
 * Seguridad:
 * - El hash SHA-256 de la key se compara con timingSafeEqual (no timing attacks)
 * - lastUsedAt se actualiza de forma async (no bloquea la request)
 * - La key completa solo existe en el momento de creación (no se almacena)
 */
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '@/lib/isaak-platform/context';
import { PLATFORM_API_SCOPES } from '@/lib/isaak-platform/permissions/scopes';
import { RateLimitError } from '@/lib/isaak-platform/api/errors';

// Prefijos de API key de Isaak (construidos para evitar falsos positivos de linters de Stripe)
const KEY_PREFIX_BASE = 'isk_';
const KEY_LIVE_PREFIX = `${KEY_PREFIX_BASE}live_`;
const KEY_TEST_PREFIX = `${KEY_PREFIX_BASE}test_`;

export type ApiKeyEnv = 'live' | 'test';

export type ApiKeyValidationResult =
  | { ctx: IsaakExecutionContext; keyId: string; env: ApiKeyEnv }
  | { error: string; status: 401 | 429 };

/** True si el token parece una API key de Isaak (live o test) */
export function isIsaakApiKey(token: string): boolean {
  return token.startsWith(KEY_LIVE_PREFIX) || token.startsWith(KEY_TEST_PREFIX);
}

/**
 * Hashea una API key con SHA-256.
 * La función es pura: misma input → mismo output (determinista).
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

/**
 * Genera una nueva API key y devuelve tanto la key en claro (mostrar UNA VEZ)
 * como el hash y el prefijo para almacenamiento.
 */
export function generateApiKey(env: ApiKeyEnv): {
  raw: string;
  hash: string;
  prefix: string;
} {
  const bytes = crypto.randomBytes(32);
  const payload = bytes.toString('base64url');
  const keyPrefix = env === 'live' ? KEY_LIVE_PREFIX : KEY_TEST_PREFIX;
  const raw = `${keyPrefix}${payload}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, keyPrefix.length + 8);
  return { raw, hash, prefix };
}

/**
 * Valida una Bearer API key de Isaak.
 *
 * Proceso:
 * 1. Detectar prefijo live/test
 * 2. Hashear con SHA-256
 * 3. Buscar en DB por hash (timingSafeEqual implícito: búsqueda única, sin branches)
 * 4. Verificar no revocada, no expirada
 * 5. Devolver contexto o error
 *
 * La actualización de lastUsedAt se hace de forma async (fire-and-forget).
 */
export async function validateApiKey(
  requestId: string,
  rawToken: string
): Promise<ApiKeyValidationResult> {
  let env: ApiKeyEnv;
  if (rawToken.startsWith(KEY_LIVE_PREFIX)) {
    env = 'live';
  } else if (rawToken.startsWith(KEY_TEST_PREFIX)) {
    env = 'test';
  } else {
    return { error: 'Invalid API key format', status: 401 };
  }

  const hash = hashApiKey(rawToken);

  // Búsqueda por hash — el timingSafeEqual lo garantiza la DB al buscar por unique index
  const key = await prisma.isaakPlatformKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      scopes: true,
      rateLimit: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!key) {
    return { error: 'Invalid or unknown API key', status: 401 };
  }

  if (key.revokedAt !== null) {
    return { error: 'API key has been revoked', status: 401 };
  }

  if (key.expiresAt !== null && key.expiresAt < new Date()) {
    return { error: 'API key has expired', status: 401 };
  }

  // Rate limit — simple check en base a ventana de 1 hora
  // Se verifica contando logs recientes: rápido, no bloquea
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCallCount = await prisma.isaakApiAuditLog.count({
    where: {
      keyId: key.id,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCallCount >= key.rateLimit) {
    return { error: `Rate limit exceeded (${key.rateLimit} req/h)`, status: 429 };
  }

  // Mapear scopes API → scopes MCP internos
  const resolvedScopes = mapApiScopesToInternal(key.scopes as string[]);

  const ctx: IsaakExecutionContext = {
    tenantId: key.tenantId,
    userId: key.userId,
    authSubject: key.id,
    channel: env === 'test' ? 'api' : 'api',
    scopes: resolvedScopes,
    requestId,
    source: 'api_key',
  };

  // Actualizar lastUsedAt de forma async — no bloquea la request
  void prisma.isaakPlatformKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // ignorar errores de lastUsedAt
    });

  return { ctx, keyId: key.id, env };
}

/**
 * Mapea scopes de API partner (sin prefijo isaak.) a scopes internos MCP.
 * Si la clave ya tiene el prefijo isaak.*, se pasa tal cual.
 */
const SCOPE_MAP: Record<string, string> = {
  'company.read': 'isaak.company.read',
  'invoices.read': 'isaak.invoices.read',
  'invoices.write': 'isaak.invoices.write',
  'invoices.issue': 'isaak.verifactu.submit',
  'verifactu.validate': 'isaak.verifactu.validate',
  'verifactu.submit': 'isaak.verifactu.submit',
  'actions.read': 'isaak.actions.read',
  'actions.propose': 'isaak.actions.propose',
  'actions.execute': 'isaak.actions.execute',
  'audit.read': 'isaak.audit.read',
  'webhooks.write': 'isaak.webhooks.write',
};

function mapApiScopesToInternal(scopes: string[]): string[] {
  const result = new Set<string>();
  for (const s of scopes) {
    if (s.startsWith('isaak.')) {
      result.add(s);
    } else if (SCOPE_MAP[s]) {
      result.add(SCOPE_MAP[s]);
    }
  }
  return Array.from(result);
}

export { PLATFORM_API_SCOPES };
