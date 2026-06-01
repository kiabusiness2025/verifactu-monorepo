// Auth Package
export { authOptions } from './config/authOptions';
export { requireAuth, requireRole } from './middleware/guards';
export {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  getSessionTokenFromCookieStore,
  getSharedSessionPayloadFromCookieStore,
  readSessionSecret,
  readSessionSecrets,
  resolveSharedTenantSession,
  signConsentProof,
  signSessionToken,
  verifyConsentProof,
  verifySessionToken,
  verifySessionTokenFromEnv,
  verifySessionTokenWithFallback,
} from './shared-session';
export { UserRole, type AuthUser, type SessionUser } from './types';
export { checkPermission, canImpersonate } from './utils/permissions';
export type {
  ConsentProofInput,
  SessionCookieInput,
  SessionCookieOptions,
  SessionPayload,
  SessionSameSite,
  SharedTenantSession,
} from './shared-session';
