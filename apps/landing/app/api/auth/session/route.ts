import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import admin from "firebase-admin";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

function cookieDomainFromHost(host: string | null) {
  if (!host) return undefined;
  if (host.endsWith("verifactu.business")) return ".verifactu.business";
  return undefined;
}

export async function POST(req: Request) {
  initFirebaseAdmin();

  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const decoded = await admin.auth().verifyIdToken(idToken);

  const secret = new TextEncoder().encode(requireEnv("SESSION_SECRET"));

  const token = await new SignJWT({
    uid: decoded.uid,
    email: decoded.email ?? null,
    ver: 1,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const url = new URL(req.url);
  const host = req.headers.get("host");

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "__session",
    value: token,
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    domain: cookieDomainFromHost(host),
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
