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
    console.error(`[📋 API] Missing required env var: ${name}`);
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

async function getOrCreateTenantForUser(uid: string, email: string) {
  try {
    console.log("[Auth] getOrCreateTenantForUser START", { uid, email });
    console.log("[Auth] DATABASE_URL exists:", !!process.env.DATABASE_URL);
    
    const dbPool = getDbPool();
    console.log("[Auth] Pool created");
    
    // 1. Verificar/crear usuario
    console.log("[Auth] Step 1: Upserting user");
    
    // Usar UPSERT que maneja tanto conflictos de id como de email
    await dbPool.query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) 
       DO UPDATE SET 
         id = EXCLUDED.id,
         name = EXCLUDED.name
       RETURNING id`,
      [uid, email, email.split("@")[0]]
    );
    
    console.log("[Auth] Step 1: User upserted successfully");

    // 2. Obtener membership del usuario (si existe)
    console.log("[Auth] Step 2: Checking existing membership");
    const membershipResult = await dbPool.query(
      `SELECT tenant_id FROM memberships 
       WHERE user_id = $1 AND status = 'active'
       LIMIT 1`,
      [uid]
    );

    if (membershipResult.rows.length > 0) {
      console.log("[Auth] Existing tenant found:", membershipResult.rows[0].tenant_id);
      return membershipResult.rows[0].tenant_id;
    }

    // 3. Crear tenant si no existe
    console.log("[Auth] Step 3: Creating new tenant");
    const tenantResult = await dbPool.query(
      `INSERT INTO tenants (name, legal_name)
       VALUES ($1, $2)
       RETURNING id`,
      [email.split("@")[0], email.split("@")[0]]
    );
    const newTenantId = tenantResult.rows[0].id;
    console.log("[Auth] Step 3: Tenant created:", newTenantId);

    // 4. Crear membership (owner)
    console.log("[Auth] Step 4: Creating membership");
    await dbPool.query(
      `INSERT INTO memberships (tenant_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT DO NOTHING`,
      [newTenantId, uid]
    );
    console.log("[Auth] Step 4: Membership created");

    // 5. Crear user_preferences
    console.log("[Auth] Step 5: Creating user_preferences");
    await dbPool.query(
      `INSERT INTO user_preferences (user_id, preferred_tenant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET preferred_tenant_id = $2`,
      [uid, newTenantId]
    );
    console.log("[Auth] Step 5: user_preferences created");

    console.log("[Auth] getOrCreateTenantForUser SUCCESS:", newTenantId);
    return newTenantId;
  } catch (error) {
    console.error("[Auth] Error en getOrCreateTenantForUser:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      code: (error as any)?.code,
      detail: (error as any)?.detail,
    });
    // Re-throw para que el caller pueda ver el error específico
    throw error;
  }
}

export async function POST(req: Request) {
  console.log("[📋 API] /api/auth/session START");
  
  try {
    console.log("[📋 API] Initializing Firebase Admin");
    initFirebaseAdmin();
    console.log("[📋 API] Firebase Admin initialized");

    const { idToken } = await req.json().catch(() => ({}));
    if (!idToken) {
      console.error("[📋 API] Missing idToken in request body");
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    console.log("[📋 API] Verifying idToken with Firebase Admin");
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("[📋 API] idToken verified", {
      uid: decoded.uid,
      email: decoded.email,
    });

    // Obtener o crear tenant para el usuario
    console.log("[📋 API] Getting or creating tenant");
    let tenantId: string;
    try {
      tenantId = await getOrCreateTenantForUser(decoded.uid, decoded.email || "");
    } catch (dbError) {
      console.error("[📋 API] Database error in getOrCreateTenantForUser:", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        code: (dbError as any)?.code,
        detail: (dbError as any)?.detail,
      });
      return NextResponse.json(
        { 
          error: "Database error creating user session",
          detail: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
    
    if (!tenantId) {
      console.error("[📋 API] tenantId is null or undefined after getOrCreateTenantForUser");
      return NextResponse.json(
        { error: "Failed to create user session: No tenant ID returned" },
        { status: 500 }
      );
    }
    console.log("[📋 API] Tenant resolved", { tenantId });

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
      role: roles[0] ?? "member", // Primary role for backwards compatibility
      roles,
      tenants,
      ver: 1,
    };

    console.log("[📋 API] Signing session token");
    console.log("[📋 API] SESSION_SECRET check:", {
      exists: !!process.env.SESSION_SECRET,
      length: process.env.SESSION_SECRET?.length || 0,
      vercel_env: process.env.VERCEL_ENV,
    });
    const secret = readSessionSecret();
    const token = await signSessionToken({ payload, secret, expiresIn: "30d" });
    console.log("[📋 API] Session token signed successfully");

    const url = new URL(req.url);
    const host = req.headers.get("host");
    console.log("[📋 API] Building cookie options", {
      host,
      domain: process.env.SESSION_COOKIE_DOMAIN,
      sameSite: process.env.SESSION_COOKIE_SAMESITE,
      secure: process.env.SESSION_COOKIE_SECURE,
    });

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
    console.log("[📋 API] Session cookie set successfully");
    return res;
  } catch (error) {
    console.error("[📋 API] Error in POST /api/auth/session:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
