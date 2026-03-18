import prisma from '@/lib/prisma';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { getAppUrl, getLandingUrl, signSessionToken, verifySessionToken } from '@verifactu/utils';
import { createHash } from 'crypto';

export const MCP_RESOURCE_PATH = '/api/mcp/holded';
export const MCP_AUTHORIZATION_PATH = '/oauth/authorize';
export const MCP_TOKEN_PATH = '/oauth/token';
export const MCP_USERINFO_PATH = '/oauth/userinfo';
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

export const MCP_TOOL_SCOPES: Record<string, string[]> = {
  holded_list_invoices: ['mcp.read', 'holded.invoices.read'],
  holded_get_invoice: ['mcp.read', 'holded.invoices.read'],
  holded_list_contacts: ['mcp.read', 'holded.contacts.read'],
  holded_list_accounts: ['mcp.read', 'holded.accounts.read'],
  holded_list_bookings: ['mcp.read', 'holded.crm.read'],
  holded_list_projects: ['mcp.read', 'holded.projects.read'],
  holded_get_project: ['mcp.read', 'holded.projects.read'],
  holded_list_project_tasks: ['mcp.read', 'holded.projects.read'],
  holded_create_invoice_draft: ['mcp.read', 'holded.invoices.write'],
};

function readOAuthSecret() {
  const secret =
    process.env.MCP_OAUTH_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim();

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

export function getAuthorizationServerMetadataUrl() {
  return `${getAppUrl()}${MCP_AUTH_SERVER_METADATA_PATH}`;
}

export function getProtectedResourceMetadataUrl() {
  return `${getAppUrl()}${MCP_PROTECTED_RESOURCE_METADATA_PATH}`;
}

export function getAllowedRedirectOrigins() {
  const fromEnv = (process.env.MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : ['https://chatgpt.com', 'https://chat.openai.com'];
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

export function verifyPkce(codeVerifier: string, expectedChallenge: string) {
  const challenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return challenge === expectedChallenge;
}

export function getSupportedScopes() {
  return [
    'mcp.read',
    'holded.invoices.read',
    'holded.contacts.read',
    'holded.accounts.read',
    'holded.crm.read',
    'holded.projects.read',
    'holded.invoices.write',
  ];
}

export function getDefaultScopes() {
  return [
    'mcp.read',
    'holded.invoices.read',
    'holded.contacts.read',
    'holded.accounts.read',
    'holded.crm.read',
    'holded.projects.read',
    'holded.invoices.write',
  ];
}

export function ensureScopesAllowed(scope: string) {
  const requested = buildScopeList(scope);
  const supported = new Set(getSupportedScopes());
  return requested.every((item) => supported.has(item));
}

export function hasRequiredScopes(scope: string, required: string[]) {
  const granted = new Set(buildScopeList(scope));
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

export function buildLoginUrl(currentAuthorizeUrl: string) {
  const loginUrl = new URL('/auth/login', getLandingUrl());
  loginUrl.searchParams.set('next', currentAuthorizeUrl);
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
    const name = `${tenant.name ?? ''} ${tenant.legalName ?? ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
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
        OR: [
          { authSubject: input.uid },
          ...(input.email ? [{ email: input.email }] : []),
        ],
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
      OR: [
        { authSubject: input.uid },
        ...(input.email ? [{ email: input.email }] : []),
      ],
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
