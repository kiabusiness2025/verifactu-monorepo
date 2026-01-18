import { NextResponse } from "next/server";
import {
  signSessionToken,
  readSessionSecret,
  buildSessionCookieOptions,
  type SessionPayload,
} from "@verifactu/utils";
import admin from "firebase-admin";
import { Pool } from "pg";

export const runtime = "nodejs";

let pool: Pool | null = null;

function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return pool;
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`[API] Missing required env var: ${name}`);
    throw new Error(`Missing env var: ${name}`);
  }
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

async function getTenantForUser(uid: string, email: string, displayName?: string) {
  const dbPool = getDbPool();

  // Usar el nombre de Firebase si está disponible, sino el email
  const userName = displayName || email.split("@")[0];

  await dbPool.query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [uid, email, userName]
  );

  const membershipResult = await dbPool.query(
    `SELECT tenant_id FROM memberships
     WHERE user_id = $1 AND status = 'active'
     LIMIT 1`,
    [uid]
  );

  if (membershipResult.rows.length > 0) {
    return membershipResult.rows[0].tenant_id as string;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    initFirebaseAdmin();

    const { idToken } = await req.json().catch(() => ({}));
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    
    // Obtener información del usuario de Firebase
    const userRecord = await admin.auth().getUser(decoded.uid);
    const displayName = userRecord.displayName || decoded.name || undefined;
    
    const tenantId = await getTenantForUser(decoded.uid, decoded.email || "", displayName);

    const rolesRaw = (decoded as any).roles ?? (decoded as any).role ?? [];
    const tenantsRaw = (decoded as any).tenants ?? (decoded as any).tenant ?? [];
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw.map((role) => String(role))
      : rolesRaw
        ? [String(rolesRaw)]
        : [];
    const tenants = Array.isArray(tenantsRaw)
      ? tenantsRaw.map((tenant) => String(tenant))
      : tenantsRaw
        ? [String(tenantsRaw)]
        : [];

    const payload: SessionPayload = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      tenantId: tenantId || undefined,
      role: roles[0] ?? "member",
      roles,
      tenants,
      ver: 1,
    };

    const secret = readSessionSecret();
    const token = await signSessionToken({ payload, secret, expiresIn: "30d" });

    const url = new URL(req.url);
    const host = req.headers.get("host");
    const cookieOpts = buildSessionCookieOptions({
      url: url.toString(),
      host,
      domainEnv: process.env.SESSION_COOKIE_DOMAIN,
      secureEnv: process.env.SESSION_COOKIE_SECURE,
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE,
      value: token,
      maxAgeSeconds: 60 * 60 * 24 * 30,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieOpts);
    return res;
  } catch (error) {
    console.error("[API] Error in POST /api/auth/session:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
