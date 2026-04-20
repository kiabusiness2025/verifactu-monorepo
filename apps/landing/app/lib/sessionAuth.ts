import {
  type SessionPayload,
  SESSION_COOKIE_NAME,
  verifySessionTokenFromEnv,
} from '@verifactu/utils';
import type { NextRequest } from 'next/server';

export async function getSessionPayloadFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionTokenFromEnv(token);
  } catch {
    return null;
  }
}
