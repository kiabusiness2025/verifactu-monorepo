import { JWTPayload, SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "__session";

export type SessionPayload = JWTPayload & {
  uid?: string;
  email?: string | null;
  name?: string | null;
  tenantId?: string;
  roles?: string[];
  tenants?: string[];
};

export type SessionSameSite = "lax" | "strict" | "none";

export function readSessionSecret(value = process.env.SESSION_SECRET): string {
  const secret = value?.trim();
  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }
  return secret;
}

export async function signSessionToken(params: {
  payload: SessionPayload;
  secret: string;
  expiresIn?: string | number;
}) {
  const { payload, secret, expiresIn = "30d" } = params;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export type SessionCookieInput = {
  url: string;
  host?: string | null;
  domainEnv?: string | null;
  secureEnv?: string | null;
  sameSiteEnv?: string | null;
  maxAgeSeconds?: number;
};

export type SessionCookieOptions = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: SessionSameSite;
  path: "/";
  domain?: string;
  maxAge: number;
};

export function buildSessionCookieOptions(input: SessionCookieInput & { value: string }): SessionCookieOptions {
  const { url, host, domainEnv, secureEnv, sameSiteEnv, maxAgeSeconds = 60 * 60 * 24 * 30, value } = input;

  const domain = resolveCookieDomain(host, domainEnv);
  const sameSite = resolveSameSite(sameSiteEnv);
  const secure = resolveSecure(url, secureEnv) || sameSite === "none";

  return {
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    domain,
    maxAge: maxAgeSeconds,
  };
}

function resolveCookieDomain(host: string | null | undefined, domainEnv?: string | null) {
  if (domainEnv !== undefined && domainEnv !== null) {
    const trimmed = domainEnv.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (!host) return undefined;
  if (host.endsWith("verifactu.business")) return ".verifactu.business";
  return undefined;
}

function resolveSecure(url: string, secureEnv?: string | null) {
  const normalized = secureEnv?.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return url.startsWith("https:");
}

function resolveSameSite(sameSiteEnv?: string | null): SessionSameSite {
  const normalized = sameSiteEnv?.toLowerCase();
  if (normalized === "strict" || normalized === "none") return normalized;
  return "lax";
}
