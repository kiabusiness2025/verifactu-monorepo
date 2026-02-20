import {
  SESSION_COOKIE_NAME,
  verifySessionTokenFromEnv,
  type SessionPayload,
} from '@verifactu/utils';
import { cookies } from 'next/headers';

export type { SessionPayload };

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionTokenFromEnv(token);
  } catch {
    return null;
  }
}

export function requireUserId(payload: SessionPayload | null): string {
  const uid = payload?.uid;
  if (!uid) {
    throw new Error('Unauthenticated: uid missing in session token');
  }
  return uid;
}
