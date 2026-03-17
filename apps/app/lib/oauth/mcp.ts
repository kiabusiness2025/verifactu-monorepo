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
    'holded.invoices.write',
  ];
}

export function getDefaultScopes() {
  return [
    'mcp.read',
    'holded.invoices.read',
    'holded.contacts.read',
    'holded.accounts.read',
    'holded.invoices.write',
  ];
}

export function ensureScopesAllowed(scope: string) {
  const requested = buildScopeList(scope);
  const supported = new Set(getSupportedScopes());
  return requested.every((item) => supported.has(item));
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
