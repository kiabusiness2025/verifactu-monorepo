import { query } from '@/lib/db';
import {
  type HoldedMcpScopePreset,
  HOLDED_MCP_SUPPORTED_SCOPES,
  HOLDED_MCP_TOOL_SCOPES,
  getHoldedMcpScopePreset,
} from '@/lib/integrations/holdedMcpScopes';
import prisma from '@/lib/prisma';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { getAppUrl, signSessionToken, verifySessionToken } from '@verifactu/utils';
import { createHash, randomUUID } from 'crypto';

export const MCP_RESOURCE_PATH = '/api/mcp/holded';
export const MCP_AUTHORIZATION_PATH = '/oauth/authorize';
export const MCP_TOKEN_PATH = '/oauth/token';
export const MCP_USERINFO_PATH = '/oauth/userinfo';
export const MCP_REGISTRATION_PATH = '/oauth/register';
export const MCP_REVOCATION_PATH = '/oauth/revoke';
export const MCP_AUTH_SERVER_METADATA_PATH = '/.well-known/oauth-authorization-server';
export const MCP_PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';

type MappedSession = {
  uid: string;
  email: string | null;
  name: string | null;
  tenantId: string;
};

type AuthorizationCodePayload = {
  type: 'mcp_auth_code';
  codeId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: 'S256' | null;
  resource: string;
  uid: string;
  email: string | null;
  name: string | null;
  tenantId: string;
};

type AccessTokenPayload = {
  type: 'mcp_access_token';
  clientId: string;
  scope: string;
  resource: string;
  uid: string;
  email: string | null;
  name: string | null;
  tenantId: string;
};

export type HoldedOnboardingAuthMethod = 'unknown' | 'google' | 'email';

type HoldedOnboardingPayload = {
  type: 'mcp_holded_onboarding';
  uid: string;
  email: string | null;
  name: string | null;
  tenantId?: string | null;
  tenantBound?: boolean | null;
  authMethod?: HoldedOnboardingAuthMethod | null;
  emailVerified?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  verifiedAt?: string | null;
};

type HoldedEmailVerificationPayload = {
  type: 'mcp_holded_email_verification';
  uid: string;
  email: string;
  name?: string | null;
  tenantId?: string | null;
  tenantBound?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  returnUrl?: string | null;
};

export const MCP_TOOL_SCOPES = HOLDED_MCP_TOOL_SCOPES;

const SUPPORTED_SCOPES = [...HOLDED_MCP_SUPPORTED_SCOPES];
// C2 (auditoria OpenAI 2026-05-07): el preset por defecto del flujo publico se
// alinea con el conjunto de tools declarado en
// `docs/openai-submission/tool-hint-justifications.json` para que `tools/list`
// exponga EXACTAMENTE las mismas tools que el manifest firmado en submission.
// Anteriormente era `holded_public_campaign_v1` (5 scopes / 7 tools), y si la
// env var MCP_PUBLIC_SCOPE_PRESET no estaba seteada en produccion, el revisor
// de OpenAI veia un set de tools distinto al que firmamos en la submission —
// causa textbook de rechazo.
//
// Histórico:
//   - 2026-05-07: aligned con `openai_review_v2` (14 tools).
//   - 2026-05-11: default expandido a `holded_full_read_v1` (22 tools) bajo la
//     asunción incorrecta de que OpenAI permite ampliar el catálogo durante el
//     review. Causó rechazo y se revirtió.
//   - 2026-05-15: REVERTIDO a `openai_review_v2` (14 tools) tras la primera
//     rejection del review.
//   - 2026-05-18: AMPLIADO a `claude_parity` (29 tools, todas read-only excepto
//     create_invoice_draft) coincidiendo con el resubmit que combina los fixes
//     del PR #88 (brotli/paginación/endtmp/$ref/schema). El manifest
//     `tool-hint-justifications.json` se actualizó simultáneamente para
//     mantener alineación 1:1 runtime ↔ manifest. La submission form en el
//     portal OpenAI DEBE actualizarse antes del deploy o se rechaza por
//     "Tool annotations match the MCP runtime" — ver
//     `docs/openai-submission/OPENAI_FORM_COPY_PASTE.md`.
const DEFAULT_PUBLIC_SCOPE_PRESET: HoldedMcpScopePreset = 'claude_parity';
const AUTHORIZATION_CODE_REDEMPTIONS_TABLE = 'oauth_authorization_code_redemptions';

type MintAuthorizationCodeInput = Omit<AuthorizationCodePayload, 'codeId'>;

let authorizationCodeRedemptionsTableEnsured = false;

function isHoldedMcpScopePreset(value: string): value is HoldedMcpScopePreset {
  return (
    value === 'full' ||
    value === 'readonly' ||
    value === 'invoicing_accounting' ||
    value === 'holded_phase2_accounting' ||
    value === 'holded_public_campaign_v1' ||
    value === 'holded_priority1' ||
    value === 'openai_review_v2' ||
    value === 'holded_full_read_v1' ||
    value === 'claude_parity'
  );
}

function readOAuthSecret() {
  const secret = process.env.MCP_OAUTH_SECRET?.trim() || process.env.SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error('MCP_OAUTH_SECRET or SESSION_SECRET is required');
  }

  return secret;
}

function getHoldedConnectorPublicUrl() {
  const fallback = 'https://holded.verifactu.business';
  const raw =
    process.env.HOLDED_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() ||
    process.env.MCP_PUBLIC_CONNECTOR_URL?.trim() ||
    fallback;

  try {
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
}

function buildAuthorizationCodeIdHash(codeId: string) {
  return createHash('sha256').update(codeId).digest('hex');
}

async function ensureAuthorizationCodeRedemptionsTable() {
  if (authorizationCodeRedemptionsTableEnsured) {
    return;
  }

  await query(
    [
      `CREATE TABLE IF NOT EXISTS ${AUTHORIZATION_CODE_REDEMPTIONS_TABLE} (`,
      '  code_id_hash text PRIMARY KEY,',
      '  redeemed_at timestamptz NOT NULL DEFAULT now(),',
      '  expires_at timestamptz',
      ')',
    ].join(' ')
  );
  await query(
    `CREATE INDEX IF NOT EXISTS ${AUTHORIZATION_CODE_REDEMPTIONS_TABLE}_expires_at_idx ON ${AUTHORIZATION_CODE_REDEMPTIONS_TABLE} (expires_at)`
  );

  authorizationCodeRedemptionsTableEnsured = true;
}

export function getMcpResourceUrl() {
  const override = process.env.MCP_RESOURCE_URL?.trim();
  if (override) return override;
  return `${getHoldedConnectorPublicUrl()}${MCP_RESOURCE_PATH}`;
}

export function getAuthorizationEndpoint() {
  return `${getHoldedConnectorPublicUrl()}${MCP_AUTHORIZATION_PATH}`;
}

export function getTokenEndpoint() {
  return `${getHoldedConnectorPublicUrl()}${MCP_TOKEN_PATH}`;
}

export function getUserInfoEndpoint() {
  return `${getAppUrl()}${MCP_USERINFO_PATH}`;
}

export function getRegistrationEndpoint() {
  return `${getHoldedConnectorPublicUrl()}${MCP_REGISTRATION_PATH}`;
}

export function getAuthorizationServerIssuer() {
  return getHoldedConnectorPublicUrl();
}

export function getAuthorizationServerMetadataUrl() {
  return `${getHoldedConnectorPublicUrl()}${MCP_AUTH_SERVER_METADATA_PATH}`;
}

export function getRevocationEndpoint() {
  return `${getHoldedConnectorPublicUrl()}${MCP_REVOCATION_PATH}`;
}

function getProtectedResourceMetadataPath(resourcePath: string) {
  const normalizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${MCP_PROTECTED_RESOURCE_METADATA_PATH}${normalizedPath}`;
}

export function getProtectedResourceMetadataUrl(resourceUrl = getMcpResourceUrl()) {
  const resource = new URL(resourceUrl);
  return `${resource.origin}${getProtectedResourceMetadataPath(resource.pathname)}`;
}

export function getProtectedResourceMetadata() {
  return {
    resource: getMcpResourceUrl(),
    authorization_servers: [getAuthorizationServerIssuer()],
    bearer_methods_supported: ['header'],
    scopes_supported: getAdvertisedScopes(),
  };
}

export function getAllowedRedirectOrigins() {
  const defaults = [
    'https://chatgpt.com',
    'https://chat.openai.com',
    'https://platform.openai.com',
  ];
  const fromEnv = (process.env.MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...fromEnv]));
}

function mergeVaryHeader(existing: string | null, value: string) {
  const varyValues = new Set(
    (existing || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  varyValues.add(value);
  return Array.from(varyValues).join(', ');
}

export function applyOpenAiCorsHeaders<T extends { headers: Headers }>(
  response: T,
  request: Pick<Request, 'headers'>,
  options?: {
    methods?: string[];
    allowHeaders?: string[];
    exposeHeaders?: string[];
  }
) {
  const origin = request.headers.get('origin')?.trim();
  if (!origin || !getAllowedRedirectOrigins().includes(origin)) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin);

  if (options?.methods?.length) {
    response.headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
  }

  if (options?.allowHeaders?.length) {
    response.headers.set('Access-Control-Allow-Headers', options.allowHeaders.join(', '));
  }

  if (options?.exposeHeaders?.length) {
    response.headers.set('Access-Control-Expose-Headers', options.exposeHeaders.join(', '));
  }

  response.headers.set('Access-Control-Max-Age', '600');
  response.headers.set('Vary', mergeVaryHeader(response.headers.get('Vary'), 'Origin'));

  return response;
}

export function validateRedirectUri(redirectUri: string) {
  let parsed: URL;

  try {
    parsed = new URL(redirectUri);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  const origin = `${parsed.protocol}//${parsed.host}`;
  return getAllowedRedirectOrigins().includes(origin);
}

export function normalizeScope(input: string | null | undefined) {
  const requested = (input || '')
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(requested));
  return unique.join(' ');
}

export function buildScopeList(input: string | null | undefined) {
  return normalizeScope(input)
    .split(' ')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isValidPkceCodeChallenge(codeChallenge: string) {
  return /^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge);
}

export function isValidPkceCodeVerifier(codeVerifier: string) {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier);
}

export async function mintAuthorizationCode(input: MintAuthorizationCodeInput) {
  return signSessionToken({
    payload: {
      ...input,
      codeId: randomUUID(),
    },
    secret: readOAuthSecret(),
    expiresIn: '5m',
  });
}

export async function verifyAuthorizationCode(code: string) {
  const payload = await verifySessionToken(code, readOAuthSecret());

  if (!payload || payload.type !== 'mcp_auth_code') return null;
  if (typeof payload.codeId !== 'string' || !payload.codeId.trim()) return null;
  return payload as AuthorizationCodePayload & { exp?: number; iat?: number };
}

export async function consumeAuthorizationCode(codeId: string, exp?: number) {
  await ensureAuthorizationCodeRedemptionsTable();

  const rows = await query<{ code_id_hash: string }>(
    [
      `INSERT INTO ${AUTHORIZATION_CODE_REDEMPTIONS_TABLE} (code_id_hash, expires_at)`,
      'VALUES ($1, $2)',
      'ON CONFLICT (code_id_hash) DO NOTHING',
      'RETURNING code_id_hash',
    ].join(' '),
    [
      buildAuthorizationCodeIdHash(codeId),
      typeof exp === 'number' ? new Date(exp * 1000).toISOString() : null,
    ]
  );

  return rows.length > 0;
}

// C3 (auditoria OpenAI 2026-05-07): TTL extendido a 24h (era 1h).
// Motivo: el revisor de OpenAI ejecuta entre 6 y 12 prompts en la sesion de
// review, frecuentemente espaciados (notas, comparaciones, cambios de pagina).
// Con TTL=1h era frecuente que la sesion expirara mid-review y ChatGPT
// mostrara "connector disconnected" en mitad de las pruebas. 24h cubre la
// review completa sin necesidad de refresh tokens. Mantener este valor en
// sincronia con `expires_in` devuelto por /oauth/token.
export async function mintAccessToken(input: AccessTokenPayload) {
  return signSessionToken({
    payload: input,
    secret: readOAuthSecret(),
    expiresIn: '24h',
  });
}

export async function verifyAccessToken(token: string) {
  const payload = await verifySessionToken(token, readOAuthSecret());

  if (!payload || payload.type !== 'mcp_access_token') return null;
  return payload as AccessTokenPayload & { exp?: number; iat?: number };
}

type RefreshTokenPayload = {
  type: 'mcp_refresh_token';
  clientId: string;
  scope: string;
  resource: string;
  uid: string;
  email: string | null;
  name: string | null;
  tenantId: string;
};

export async function mintRefreshToken(input: Omit<RefreshTokenPayload, 'type'>) {
  return signSessionToken({
    payload: { ...input, type: 'mcp_refresh_token' } satisfies RefreshTokenPayload,
    secret: readOAuthSecret(),
    expiresIn: '30d',
  });
}

export async function verifyRefreshToken(token: string) {
  const payload = await verifySessionToken(token, readOAuthSecret());
  if (!payload || payload.type !== 'mcp_refresh_token') return null;
  return payload as RefreshTokenPayload & { exp?: number; iat?: number };
}

function buildHoldedGuestUid(seed: string) {
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 32);
  return `holded-guest-${digest}`;
}

function normalizeOptionalTokenText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildHoldedOnboardingDisplayName(input: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fallback: string;
}) {
  const explicit = normalizeOptionalTokenText(input.name);
  if (explicit) return explicit;

  const fromParts = [
    normalizeOptionalTokenText(input.firstName),
    normalizeOptionalTokenText(input.lastName),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fromParts || input.fallback;
}

export async function mintHoldedOnboardingToken(input: {
  seed: string;
  email?: string | null;
  name?: string | null;
  tenantId?: string | null;
  tenantBound?: boolean | null;
  authMethod?: HoldedOnboardingAuthMethod | null;
  emailVerified?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  verifiedAt?: string | null;
}) {
  return signSessionToken({
    payload: {
      type: 'mcp_holded_onboarding',
      uid: buildHoldedGuestUid(input.seed),
      email: input.email ?? null,
      name: buildHoldedOnboardingDisplayName({
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        fallback: 'Connector user',
      }),
      tenantId: normalizeOptionalTokenText(input.tenantId),
      tenantBound: input.tenantBound === true,
      authMethod: input.authMethod ?? 'unknown',
      emailVerified: input.emailVerified ?? false,
      firstName: normalizeOptionalTokenText(input.firstName),
      lastName: normalizeOptionalTokenText(input.lastName),
      verifiedAt: normalizeOptionalTokenText(input.verifiedAt),
    } satisfies HoldedOnboardingPayload,
    secret: readOAuthSecret(),
    expiresIn: '2h',
  });
}

export async function mintHoldedOnboardingTokenForSubject(input: {
  uid: string;
  email?: string | null;
  name?: string | null;
  tenantId?: string | null;
  tenantBound?: boolean | null;
  authMethod?: HoldedOnboardingAuthMethod | null;
  emailVerified?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  verifiedAt?: string | null;
}) {
  return signSessionToken({
    payload: {
      type: 'mcp_holded_onboarding',
      uid: input.uid,
      email: input.email ?? null,
      name: buildHoldedOnboardingDisplayName({
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        fallback: 'Connector user',
      }),
      tenantId: normalizeOptionalTokenText(input.tenantId),
      tenantBound: input.tenantBound === true,
      authMethod: input.authMethod ?? 'unknown',
      emailVerified: input.emailVerified ?? false,
      firstName: normalizeOptionalTokenText(input.firstName),
      lastName: normalizeOptionalTokenText(input.lastName),
      verifiedAt: normalizeOptionalTokenText(input.verifiedAt),
    } satisfies HoldedOnboardingPayload,
    secret: readOAuthSecret(),
    expiresIn: '2h',
  });
}

export async function verifyHoldedOnboardingToken(token: string) {
  const payload = await verifySessionToken(token, readOAuthSecret());

  if (!payload || payload.type !== 'mcp_holded_onboarding') return null;
  return payload as HoldedOnboardingPayload & { exp?: number; iat?: number };
}

export async function mintHoldedEmailVerificationToken(input: {
  uid: string;
  email: string;
  name?: string | null;
  tenantId?: string | null;
  tenantBound?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  returnUrl?: string | null;
}) {
  return signSessionToken({
    payload: {
      type: 'mcp_holded_email_verification',
      uid: input.uid,
      email: input.email.trim(),
      name: normalizeOptionalTokenText(input.name),
      tenantId: normalizeOptionalTokenText(input.tenantId),
      tenantBound: input.tenantBound === true,
      firstName: normalizeOptionalTokenText(input.firstName),
      lastName: normalizeOptionalTokenText(input.lastName),
      returnUrl: normalizeOptionalTokenText(input.returnUrl),
    } satisfies HoldedEmailVerificationPayload,
    secret: readOAuthSecret(),
    expiresIn: '45m',
  });
}

export async function verifyHoldedEmailVerificationToken(token: string) {
  const payload = await verifySessionToken(token, readOAuthSecret());

  if (!payload || payload.type !== 'mcp_holded_email_verification') return null;
  return payload as HoldedEmailVerificationPayload & { exp?: number; iat?: number };
}

export function verifyPkce(codeVerifier: string, expectedChallenge: string) {
  const challenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return challenge === expectedChallenge;
}

export function getSupportedScopes() {
  return SUPPORTED_SCOPES;
}

export function getPublicScopePreset(): HoldedMcpScopePreset {
  const requested = process.env.MCP_PUBLIC_SCOPE_PRESET?.trim();

  // R6 hardening (auditoría 2026-05-11): fail-closed en producción.
  // El flujo OAuth público SOLO puede correr con el preset declarado en la
  // submission firmada con OpenAI (`DEFAULT_PUBLIC_SCOPE_PRESET`, actualmente
  // `claude_parity`). Si un operador setea por error la env var a otro valor
  // (full, holded_full_read_v1, openai_review_v2, etc.) ampliaría o reduciría
  // silenciosamente la superficie de tools expuesta al revisor — cualquier
  // mismatch runtime vs manifest declarado es causa textbook de rejection.
  //
  // En producción, cualquier valor distinto al default es un error de config:
  // se ignora y emitimos un warning para que se note en los logs.
  if (process.env.NODE_ENV === 'production') {
    if (requested && requested !== DEFAULT_PUBLIC_SCOPE_PRESET) {
      // eslint-disable-next-line no-console
      console.warn(
        `[mcp.getPublicScopePreset] MCP_PUBLIC_SCOPE_PRESET="${requested}" ignored in production; falling back to "${DEFAULT_PUBLIC_SCOPE_PRESET}" to honour the OpenAI submission preset.`
      );
    }
    return DEFAULT_PUBLIC_SCOPE_PRESET;
  }

  if (requested && isHoldedMcpScopePreset(requested)) {
    return requested;
  }

  return DEFAULT_PUBLIC_SCOPE_PRESET;
}

export function getAdvertisedScopes() {
  return [...getSupportedScopes()];
}

export function getDefaultScopes() {
  return [...getHoldedMcpScopePreset(getPublicScopePreset())];
}

export function ensureScopesAllowed(scope: string) {
  const requested = buildScopeList(scope);
  const supported = new Set<string>(getSupportedScopes());
  return requested.every((item) => supported.has(item));
}

export function hasRequiredScopes(scope: string, required: string[]) {
  const granted = new Set<string>(buildScopeList(scope));
  return required.every((item) => granted.has(item));
}

export function mapSessionToOAuthUser(input: {
  uid?: string;
  email?: string | null;
  name?: string | null;
  tenantId?: string | null;
}): MappedSession | null {
  if (!input.uid || !input.tenantId) return null;

  return {
    uid: input.uid,
    email: input.email ?? null,
    name: input.name ?? null,
    tenantId: input.tenantId,
  };
}

export function buildLoginUrl(currentAuthorizeUrl: string, source?: string) {
  const holdedSiteUrl =
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() || 'https://holded.verifactu.business';
  const loginUrl = new URL('/auth/holded-direct', holdedSiteUrl);
  loginUrl.searchParams.set('next', currentAuthorizeUrl);
  if (source?.trim()) {
    loginUrl.searchParams.set('source', source.trim());
  }
  return loginUrl.toString();
}

async function findDefaultDemoTenant() {
  const defaultName = process.env.MCP_DEFAULT_TENANT_NAME?.trim() || 'Empresa Demo SL';
  const defaultNif = process.env.MCP_DEFAULT_TENANT_NIF?.trim() || null;
  const normalizedDefaultName = defaultName.toLowerCase();

  const exactMatch = await prisma.tenant.findFirst({
    where: {
      OR: [
        { name: { equals: defaultName, mode: 'insensitive' } },
        { legalName: { equals: defaultName, mode: 'insensitive' } },
        ...(defaultNif ? [{ nif: defaultNif }] : []),
      ],
    },
    select: { id: true },
  });

  if (exactMatch) {
    return exactMatch;
  }

  const looseMatch = await prisma.tenant.findFirst({
    where: {
      OR: [
        { name: { contains: defaultName, mode: 'insensitive' } },
        { legalName: { contains: defaultName, mode: 'insensitive' } },
        { name: { contains: 'demo', mode: 'insensitive' } },
        { legalName: { contains: 'demo', mode: 'insensitive' } },
        ...(defaultNif ? [{ nif: defaultNif }] : []),
        { isDemo: true },
      ],
    },
    orderBy: [{ isDemo: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, legalName: true },
  });

  if (looseMatch) {
    return { id: looseMatch.id };
  }

  const normalizedFallback = normalizedDefaultName.replace(/[^a-z0-9]/g, '');
  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, legalName: true, isDemo: true },
    orderBy: [{ isDemo: 'desc' }, { createdAt: 'asc' }],
    take: 50,
  });

  const fuzzyMatch = allTenants.find((tenant) => {
    const name = `${tenant.name ?? ''} ${tenant.legalName ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return name.includes(normalizedFallback) || normalizedFallback.includes(name);
  });

  return fuzzyMatch ? { id: fuzzyMatch.id } : null;
}

async function ensureUserHasDemoTenant(userId: string) {
  let demoTenant = await findDefaultDemoTenant();
  if (!demoTenant) {
    const defaultName = process.env.MCP_DEFAULT_TENANT_NAME?.trim() || 'Empresa Demo SL';
    const defaultNif = process.env.MCP_DEFAULT_TENANT_NIF?.trim() || null;

    demoTenant = await prisma.tenant.create({
      data: {
        name: defaultName,
        legalName: defaultName,
        nif: defaultNif,
        isDemo: true,
      },
      select: { id: true },
    });
  }

  if (!demoTenant) {
    return null;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      tenantId: demoTenant.id,
      status: 'active',
    },
    select: { tenantId: true },
  });

  if (!membership) {
    await prisma.membership.create({
      data: {
        userId,
        tenantId: demoTenant.id,
        role: 'member',
        status: 'active',
      },
    });
  }

  await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      preferredTenantId: demoTenant.id,
    },
    update: {
      preferredTenantId: demoTenant.id,
    },
  });

  return demoTenant.id;
}

async function getOrCreateInternalUserForOAuth(input: {
  uid: string;
  email?: string | null;
  name?: string | null;
}) {
  const existingBySubject =
    (await prisma.user.findFirst({
      where: { authSubject: input.uid },
      select: { id: true, email: true, name: true, authSubject: true },
    })) ?? null;

  if (existingBySubject) {
    await prisma.user.update({
      where: { id: existingBySubject.id },
      data: {
        authSubject: input.uid,
        authProvider: 'FIREBASE',
        email: input.email ?? existingBySubject.email,
        name: input.name ?? existingBySubject.name,
      },
    });
    return existingBySubject.id;
  }

  const existingByEmail = input.email
    ? await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, name: true, authSubject: true },
      })
    : null;

  if (existingByEmail) {
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        email: input.email ?? existingByEmail.email,
        name: input.name ?? existingByEmail.name,
      },
    });
    return existingByEmail.id;
  }

  const created = await prisma.user.create({
    data: {
      email: input.email ?? `mcp-${input.uid}@verifactu.local`,
      name: input.name ?? input.email?.split('@')[0] ?? 'MCP User',
      authSubject: input.uid,
      authProvider: 'FIREBASE',
    },
    select: { id: true },
  });

  return created.id;
}

async function ensureUserMembershipAndPreference(input: { userId: string; tenantId: string }) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId: input.userId,
      tenantId: input.tenantId,
      status: 'active',
    },
    select: { id: true },
  });

  if (!membership) {
    await prisma.membership.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        role: 'member',
        status: 'active',
      },
    });
  }

  await prisma.userPreference.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      preferredTenantId: input.tenantId,
    },
    update: {
      preferredTenantId: input.tenantId,
    },
  });
}

async function ensureOwnedTenantForUser(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId: input.userId,
      status: 'active',
      tenant: { isDemo: false },
    },
    include: {
      tenant: {
        select: { id: true, name: true, legalName: true, isDemo: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const preferredTenantId = await prisma.userPreference
    .findUnique({
      where: { userId: input.userId },
      select: { preferredTenantId: true },
    })
    .then((pref) => pref?.preferredTenantId ?? null);

  const preferredTenant = memberships.find(
    (membership) => membership.tenantId === preferredTenantId
  )?.tenant;
  if (preferredTenant) {
    return preferredTenant.id;
  }

  if (memberships[0]?.tenantId) {
    await prisma.userPreference.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        preferredTenantId: memberships[0].tenantId,
      },
      update: {
        preferredTenantId: memberships[0].tenantId,
      },
    });
    return memberships[0].tenantId;
  }

  const workspaceBase = input.name?.trim() || input.email?.split('@')[0]?.trim() || 'Holded';
  const workspaceName = workspaceBase + ' Workspace';

  const tenant = await prisma.tenant.create({
    data: {
      name: workspaceName,
      legalName: workspaceName,
      isDemo: false,
    },
    select: { id: true },
  });

  await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      userId: input.userId,
      role: 'owner',
      status: 'active',
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      preferredTenantId: tenant.id,
    },
    update: {
      preferredTenantId: tenant.id,
    },
  });

  return tenant.id;
}

export async function resolveTenantForHoldedFirstSession(input: {
  uid: string;
  email?: string | null;
  name?: string | null;
  sessionTenantId?: string | null;
  tenantIdHint?: string | null;
}) {
  const internalUserId = await getOrCreateInternalUserForOAuth({
    uid: input.uid,
    email: input.email ?? null,
    name: input.name ?? null,
  });

  const normalizedTenantIdHint = input.tenantIdHint?.trim() || null;
  if (normalizedTenantIdHint) {
    const eligibleMembership = await prisma.membership.findFirst({
      where: {
        tenantId: normalizedTenantIdHint,
        status: 'active',
        userId: {
          in: Array.from(new Set([input.uid, internalUserId])),
        },
      },
      select: { userId: true },
    });

    if (eligibleMembership) {
      await ensureUserMembershipAndPreference({
        userId: internalUserId,
        tenantId: normalizedTenantIdHint,
      });

      return { tenantId: normalizedTenantIdHint, resolvedUserId: internalUserId };
    }
  }

  const direct = await resolveActiveTenant({
    userId: input.uid,
    sessionTenantId: input.sessionTenantId ?? null,
  });

  if (direct.tenantId) {
    const directTenant = await prisma.tenant.findUnique({
      where: { id: direct.tenantId },
      select: { id: true, isDemo: true },
    });

    if (directTenant && !directTenant.isDemo) {
      await ensureUserMembershipAndPreference({
        userId: internalUserId,
        tenantId: directTenant.id,
      });

      return { tenantId: directTenant.id, resolvedUserId: internalUserId };
    }
  }

  const ownedTenantId = await ensureOwnedTenantForUser({
    userId: internalUserId,
    email: input.email ?? null,
    name: input.name ?? null,
  });

  return { tenantId: ownedTenantId, resolvedUserId: internalUserId };
}

export async function resolveTenantForOAuthSession(input: {
  uid: string;
  email?: string | null;
  name?: string | null;
  sessionTenantId?: string | null;
}) {
  const direct = await resolveActiveTenant({
    userId: input.uid,
    sessionTenantId: input.sessionTenantId ?? null,
  });

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ authSubject: input.uid }, ...(input.email ? [{ email: input.email }] : [])],
    },
    select: { id: true },
  });

  const internalUserId =
    user?.id ??
    (await getOrCreateInternalUserForOAuth({
      uid: input.uid,
      email: input.email ?? null,
      name: input.name ?? null,
    }));

  if (direct.tenantId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: internalUserId,
        tenantId: direct.tenantId,
        status: 'active',
      },
      select: { id: true },
    });

    if (!membership) {
      await prisma.membership.create({
        data: {
          userId: internalUserId,
          tenantId: direct.tenantId,
          role: 'member',
          status: 'active',
        },
      });
    }

    await prisma.userPreference.upsert({
      where: { userId: internalUserId },
      create: {
        userId: internalUserId,
        preferredTenantId: direct.tenantId,
      },
      update: {
        preferredTenantId: direct.tenantId,
      },
    });

    return { tenantId: direct.tenantId, resolvedUserId: internalUserId };
  }

  const fallback = await resolveActiveTenant({
    userId: internalUserId,
    sessionTenantId: input.sessionTenantId ?? null,
  });

  if (fallback.tenantId) {
    return { tenantId: fallback.tenantId, resolvedUserId: internalUserId };
  }

  const demoTenantId = await ensureUserHasDemoTenant(internalUserId);
  if (demoTenantId) {
    return { tenantId: demoTenantId, resolvedUserId: internalUserId };
  }

  return { tenantId: null, resolvedUserId: internalUserId };
}
