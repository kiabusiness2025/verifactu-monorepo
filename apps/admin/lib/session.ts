import {
    readSessionSecret,
    SESSION_COOKIE_NAME,
    verifySessionToken,
    type SessionPayload,
} from "@verifactu/utils";
import { cookies } from "next/headers";

export type { SessionPayload };

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = readSessionSecret();
    return await verifySessionToken(token, secret);
  } catch {
    return null;
  }
}

export function requireUserId(payload: SessionPayload | null): string {
  const uid = payload?.uid;
  if (!uid) {
    throw new Error("Unauthenticated: uid missing in session token");
  }
  return uid;
}
