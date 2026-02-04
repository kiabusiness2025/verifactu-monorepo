import { SignJWT } from "jose";

export type SupportTokenPayload = {
  supportSessionId: string;
  tenantId: string;
  userId: string;
  adminId: string;
};

export async function signSupportToken(payload: SupportTokenPayload) {
  const secret = process.env.SUPPORT_HANDOFF_SECRET;
  if (!secret) {
    throw new Error("SUPPORT_HANDOFF_SECRET is not set");
  }
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(key);
}
