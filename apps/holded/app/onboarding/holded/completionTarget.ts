import { HOLDED_PUBLIC_URL, sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';

const HOLDed_ONBOARDING_SUCCESS_URL = new URL('/onboarding/success', HOLDED_PUBLIC_URL).toString();
const HOLDed_PUBLIC_ORIGIN = new URL(HOLDED_PUBLIC_URL).origin;
const INTERNAL_LOOP_PATHS = new Set([
  '/onboarding',
  '/onboarding/holded',
  '/auth/holded',
  '/dashboard',
]);

export function resolveHoldedCompletionTarget(next: string | undefined) {
  const sanitized = sanitizeHoldedReturnTarget(next, HOLDed_ONBOARDING_SUCCESS_URL);

  try {
    const parsed = new URL(sanitized);
    if (parsed.origin === HOLDed_PUBLIC_ORIGIN && INTERNAL_LOOP_PATHS.has(parsed.pathname)) {
      return HOLDed_ONBOARDING_SUCCESS_URL;
    }
  } catch {
    return HOLDed_ONBOARDING_SUCCESS_URL;
  }

  return sanitized;
}
