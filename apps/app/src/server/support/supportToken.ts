import { jwtVerify } from "jose";

export const SUPPORT_SESSION_COOKIE = "support_session";

export type SupportTokenPayload = {
  supportSessionId: string;
  tenantId: string;
  userId: string;
  adminId: string;
};

export async function verifySupportToken(token: string): Promise<SupportTokenPayload> {
  const secret = process.env.SUPPORT_HANDOFF_SECRET;
  if (!secret) {
    throw new Error("SUPPORT_HANDOFF_SECRET is not set");
  }
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload as SupportTokenPayload;
}
