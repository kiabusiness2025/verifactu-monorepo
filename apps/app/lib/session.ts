import { cookies } from "next/headers";
import { jwtVerify, JWTPayload } from "jose";

function getSecretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export type SessionPayload = JWTPayload & {
  uid?: string;
  email?: string;
  name?: string;
  tenantId?: string;
};

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const token = cookies().get("__session")?.value;
  const secret = getSecretKey();
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
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
