import prisma from '@/lib/prisma';
import {
  HOLDED_MCP_SUPPORTED_SCOPES,
  HOLDED_MCP_TOOL_SCOPES,
  getHoldedMcpScopePreset,
} from '@/lib/integrations/holdedMcpScopes';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { getAppUrl, getLandingUrl, signSessionToken, verifySessionToken } from '@verifactu/utils';
import { createHash } from 'crypto';

export const MCP_RESOURCE_PATH = '/api/mcp/holded';
export const MCP_AUTHORIZATION_PATH = '/oauth/authorize';
export const MCP_TOKEN_PATH = '/oauth/token';
export const MCP_USERINFO_PATH = '/oauth/userinfo';
export const MCP_REGISTRATION_PATH = '/oauth/register';
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

type HoldedOnboardingPayload = {
  type: 'mcp_holded_onboarding';
  uid: string;
  email: string | null;
  name: string | null;
};

export const MCP_TOOL_SCOPES = HOLDED_MCP_TOOL_SCOPES;

const SUPPORTED_SCOPES = [...HOLDED_MCP_SUPPORTED_SCOPES];

function readOAuthSecret() {
  const secret = process.env.MCP_OAUTH_SECRET?.trim() || process.env.SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error('MCP_OAUTH_SECRET or SESSION_SECRET is required');
  }

  return secret;
}

export function getMcpResourceUrl() {
  return `${getAppUrl()}${MCP_RESOURCE_PATH}`;
}

export function getAuthorizationEndpoint() {
  return `${getAppUrl()}${MCP_AUTHORIZATION_PATH}`;
}

export function getTokenEndpoint() {
  return `${getAppUrl()}${MCP_TOKEN_PATH}`;
}

export function getUserInfoEndpoint() {
  return `${getAppUrl()}${MCP_USERINFO_PATH}`;
}

export function getRegistrationEndpoint() {
  return `${getAppUrl()}${MCP_REGISTRATION_PATH}`;
}

export function getAuthorizationServerIssuer() {
  return getAppUrl();
}

export function getAuthorizationServerMetadataUrl() {
  return `${getAppUrl()}${MCP_AUTH_SERVER_METADATA_PATH}`;
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
    scopes_supported: getSupportedScopes(),
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

export async function mintAuthorizationCode(input: AuthorizationCodePayload) {
  return signSessionToken({
    payload: input,
    secret: readOAuthSecret(),
    expiresIn: '5m',
  });
}

export async function verifyAuthorizationCode(code: string) {
  const payload = await verifySessionToken(code, readOAuthSecret());

  if (!payload || payload.type !== 'mcp_auth_code') return null;
  return payload as AuthorizationCodePayload & { exp?: number; iat?: number };
}

export async function mintAccessToken(input: AccessTokenPayload) {
  return signSessionToken({
    payload: input,
    secret: readOAuthSecret(),
    expiresIn: '1h',
  });
}

export async function verifyAccessToken(token: string) {
  const payload = await verifySessionToken(token, readOAuthSecret());

  if (!payload || payload.type !== 'mcp_access_token') return null;
  return payload as AccessTokenPayload & { exp?: number; iat?: number };
}

function buildHoldedGuestUid(seed: string) {
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 32);
  return `holded-guest-${digest}`;
}

export async function mintHoldedOnboardingToken(input: {
  seed: string;
  email?: string | null;
  name?: string | null;
}) {
  return signSessionToken({
    payload: {
      type: 'mcp_holded_onboarding',
      uid: buildHoldedGuestUid(input.seed),
      email: input.email ?? null,
      name: input.name ?? 'Isaak user',
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

export function verifyPkce(codeVerifier: string, expectedChallenge: string) {
  const challenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return challenge === expectedChallenge;
}

export function getSupportedScopes() {
  return SUPPORTED_SCOPES;
}

export function getDefaultScopes() {
  return getHoldedMcpScopePreset('invoicing_accounting');
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
  const loginUrl = new URL('/auth/holded', holdedSiteUrl);
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
  const existing =
    (await prisma.user.findFirst({
      where: {
        OR: [{ authSubject: input.uid }, ...(input.email ? [{ email: input.email }] : [])],
      },
      select: { id: true, email: true, name: true },
    })) ?? null;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        authSubject: input.uid,
        authProvider: 'FIREBASE',
        email: input.email ?? existing.email,
        name: input.name ?? existing.name,
      },
    });
    return existing.id;
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

  const workspaceBase = input.name?.trim() || input.email?.split('@')[0]?.trim() || 'Isaak';
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
}) {
  const internalUserId = await getOrCreateInternalUserForOAuth({
    uid: input.uid,
    email: input.email ?? null,
    name: input.name ?? null,
  });

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
      const membership = await prisma.membership.findFirst({
        where: {
          userId: internalUserId,
          tenantId: directTenant.id,
          status: 'active',
        },
        select: { id: true },
      });

      if (!membership) {
        await prisma.membership.create({
          data: {
            userId: internalUserId,
            tenantId: directTenant.id,
            role: 'member',
            status: 'active',
          },
        });
      }

      await prisma.userPreference.upsert({
        where: { userId: internalUserId },
        create: {
          userId: internalUserId,
          preferredTenantId: directTenant.id,
        },
        update: {
          preferredTenantId: directTenant.id,
        },
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
