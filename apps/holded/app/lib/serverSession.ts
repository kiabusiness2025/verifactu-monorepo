import type { User } from 'firebase/auth';

export type MintSessionOptions = {
  rememberDevice?: boolean;
};

export async function mintSessionCookie(user: User, options: MintSessionOptions = {}) {
  const rememberDevice = options.rememberDevice ?? true;
  const idToken = await user.getIdToken(true);

  const res = await fetch('/api/auth/session', {
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
