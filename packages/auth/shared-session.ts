import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  readSessionSecrets,
  signSessionToken,
  verifySessionToken,
  verifySessionTokenFromEnv,
  verifySessionTokenWithFallback,
  type SessionCookieInput,
  type SessionCookieOptions,
  type SessionPayload,
  type SessionSameSite,
} from '@verifactu/utils';

export {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  readSessionSecrets,
  signSessionToken,
  verifySessionToken,
  verifySessionTokenFromEnv,
  verifySessionTokenWithFallback,
};

export type { SessionCookieInput, SessionCookieOptions, SessionPayload, SessionSameSite };

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type SharedSessionUser = {
  id: string | null;
  email: string | null;
  name: string | null;
  isBlocked?: boolean | null;
};

export type SharedTenantSession = {
  payload: SessionPayload;
  tenantId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
};

export function getSessionTokenFromCookieStore(cookieStore: CookieReader) {
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getSharedSessionPayloadFromCookieStore(
  cookieStore: CookieReader,
  input = process.env
) {
  const token = getSessionTokenFromCookieStore(cookieStore);
  if (!token) return null;

  try {
    return await verifySessionTokenFromEnv(token, input);
  } catch {
    return null;
  }
}

export async function resolveSharedTenantSession<TUser extends SharedSessionUser>(params: {
  cookieStore: CookieReader;
  input?: NodeJS.ProcessEnv;
  findUserByAuthSubject: (authSubject: string) => Promise<TUser | null>;
}): Promise<SharedTenantSession | null> {
  const payload = await getSharedSessionPayloadFromCookieStore(params.cookieStore, params.input);

  if (!payload?.uid || !payload.tenantId) {
    return null;
  }

  const user = await params.findUserByAuthSubject(payload.uid);

  if (user?.isBlocked) {
    return null;
  }

  return {
    payload,
    tenantId: payload.tenantId,
    userId: user?.id ?? null,
    email: user?.email ?? (typeof payload.email === 'string' ? payload.email : null),
    name: user?.name ?? (typeof payload.name === 'string' ? payload.name : null),
  };
}
