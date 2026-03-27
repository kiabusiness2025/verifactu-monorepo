export {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  readSessionSecrets,
  signSessionToken,
  verifySessionToken,
  verifySessionTokenFromEnv,
  verifySessionTokenWithFallback,
} from '@verifactu/auth';

export type {
  SessionCookieInput,
  SessionCookieOptions,
  SessionPayload,
  SessionSameSite,
} from '@verifactu/auth';
