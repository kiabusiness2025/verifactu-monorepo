import { NextResponse } from "next/server";
import { SignJWT } from "jose";
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

async function getOrCreateTenantForUser(uid: string, email: string) {
  try {
    const dbPool = getDbPool();
    
    // 1. Verificar/crear usuario
    await dbPool.query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [uid, email, email.split("@")[0]]
    );

    // 2. Obtener membership del usuario (si existe)
    const membershipResult = await dbPool.query(
      `SELECT tenant_id FROM memberships 
       WHERE user_id = $1 AND status = 'active'
       LIMIT 1`,
      [uid]
    );

    if (membershipResult.rows.length > 0) {
      console.log(`[Auth] Usuario ${uid} tiene tenant existente: ${membershipResult.rows[0].tenant_id}`);
      return membershipResult.rows[0].tenant_id;
    }

    // 3. Crear tenant si no existe
    console.log(`[Auth] Creando nuevo tenant para usuario ${uid} (${email})`);
    const tenantResult = await dbPool.query(
      `INSERT INTO tenants (name, legal_name)
       VALUES ($1, $2)
       RETURNING id`,
      [email.split("@")[0], email.split("@")[0]]
    );
    const newTenantId = tenantResult.rows[0].id;

    // 4. Crear membership (owner)
    await dbPool.query(
      `INSERT INTO memberships (tenant_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT DO NOTHING`,
      [newTenantId, uid]
    );

    // 5. Crear user_preferences
    await dbPool.query(
      `INSERT INTO user_preferences (user_id, preferred_tenant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET preferred_tenant_id = $2`,
      [uid, newTenantId]
    );

    console.log(`[Auth] Nuevo tenant creado: ${newTenantId} para usuario ${uid}`);
    return newTenantId;
  } catch (error) {
    console.error("[Auth] Error en getOrCreateTenantForUser:", error);
    return null;
  }
}

export async function POST(req: Request) {
  initFirebaseAdmin();

  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  
  // Obtener o crear tenant para el usuario
  const tenantId = await getOrCreateTenantForUser(decoded.uid, decoded.email || "");
  
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

  const secret = new TextEncoder().encode(requireEnv("SESSION_SECRET"));

  const token = await new SignJWT({
    uid: decoded.uid,
    email: decoded.email ?? null,
    tenantId: tenantId || undefined,
    roles,
    tenants,
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
