import type { User } from 'firebase/auth';

export type MintSessionOptions = {
  rememberDevice?: boolean;
  source?: string;
};

export async function mintSessionCookie(user: User, options: MintSessionOptions = {}) {
  const rememberDevice = options.rememberDevice ?? true;
  const idToken = await user.getIdToken(true);

  const sessionUrl = new URL('/api/auth/session', window.location.origin);
  if (options.source) {
    sessionUrl.searchParams.set('source', options.source);
  }

  const res = await fetch(sessionUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, rememberDevice }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Session mint failed (${res.status}): ${errorText || res.statusText}`);
  }

  return res.json();
}
