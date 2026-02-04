/**
 * API para gestión de logotipos de tenant (empresa)
 * 
 * GET /api/tenant/logo - Obtener logo actual del tenant
 * POST /api/tenant/logo - Subir nuevo logo a Firebase Storage
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/session";
import { resolveActiveTenant } from "@/src/server/tenant/resolveActiveTenant";
import { query } from "@/lib/db";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o",
  authDomain: "verifactu-business.firebaseapp.com",
  projectId: "verifactu-business",
  storageBucket: "verifactu-business.firebasestorage.app",
  messagingSenderId: "536174799167",
  appId: "1:536174799167:web:69c286d928239c9069cb8a",
  measurementId: "G-F91R5J137F"
};

// Initialize Firebase if not already initialized
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Verificar que el usuario pertenece al tenant y tiene permisos
async function verifyTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  const result = await query(
    `SELECT role FROM memberships WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
    [userId, tenantId]
  );
  
  if (result.length === 0) return false;
  
  const role = result[0].role;
  return role === "owner" || role === "admin";
}


/**
 * GET /api/tenant/logo
 * Obtener logo actual del tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ ok: false, error: "Token inv??lido" }, { status: 401 });
    }

    const userId: string = session.uid;

    const tenantIdParam = req.nextUrl.searchParams.get("tenantId");
    const resolved = await resolveActiveTenant({
      userId,
      sessionTenantId: session.tenantId ?? null,
    });

    let tenantId = resolved.tenantId;
    if (tenantIdParam && tenantIdParam !== tenantId) {
      if (resolved.supportMode) {
        return NextResponse.json({ ok: false, error: "Modo soporte activo" }, { status: 403 });
      }
      const hasAccess = await verifyTenantAccess(userId, tenantIdParam);
      if (!hasAccess) {
        return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });
      }
      tenantId = tenantIdParam;
    }
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId requerido" }, { status: 400 });
    }

    // Verificar acceso
    const hasAccess = await verifyTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });
    }

    // Obtener logo del tenant
    const result = await query(
      `SELECT logo_url FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.length === 0) {
      return NextResponse.json({ ok: false, error: "Tenant no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      logoURL: result[0].logo_url || null
    });
  } catch (error: any) {
    console.error("[GET /api/tenant/logo] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener logo" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ ok: false, error: "Token inv??lido" }, { status: 401 });
    }

    const userId: string = session.uid;

    const body = await req.json();
    const { tenantId: tenantIdRaw, logoURL: logoURLRaw } = body;

    const resolved = await resolveActiveTenant({
      userId,
      sessionTenantId: session.tenantId ?? null,
    });

    if (!logoURLRaw) {
      return NextResponse.json({ ok: false, error: "logoURL requerido" }, { status: 400 });
    }

    let tenantId: string | null = resolved.tenantId;
    if (tenantIdRaw && tenantIdRaw !== tenantId) {
      if (resolved.supportMode) {
        return NextResponse.json({ ok: false, error: "Modo soporte activo" }, { status: 403 });
      }
      const hasAccess = await verifyTenantAccess(userId, tenantIdRaw);
      if (!hasAccess) {
        return NextResponse.json(
          { ok: false, error: "Sin permisos para modificar este tenant" },
          { status: 403 }
        );
      }
      tenantId = tenantIdRaw;
    }
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId requerido" }, { status: 400 });
    }

    const logoURL: string = logoURLRaw;

    // Verificar acceso
    const hasAccess = await verifyTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return NextResponse.json({ ok: false, error: "Sin permisos para modificar este tenant" }, { status: 403 });
    }

    // Si es una URL externa (OAuth providers, etc.), actualizar directamente
    if (logoURL.startsWith("http://") || logoURL.startsWith("https://")) {
      await query(
        `UPDATE tenants SET logo_url = $1 WHERE id = $2`,
        [logoURL, tenantId]
      );
      return NextResponse.json({ ok: true, logoURL });
    }

    // Si es base64, subir a Firebase Storage
    const dataURLPattern = /^data:([^;]+);base64,(.+)$/;
    const matches = logoURL.match(dataURLPattern);

    if (!matches) {
      return NextResponse.json(
        { ok: false, error: "Formato de imagen inv??lido. Use data URL o URL externa." },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Validar que es una imagen
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Solo se permiten im??genes" },
        { status: 400 }
      );
    }

    // Convertir base64 a Buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Validar tama??o (5MB m??ximo)
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { ok: false, error: "La imagen no puede superar los 5MB" },
        { status: 400 }
      );
    }

    // Obtener extensi??n
    const extension = mimeType.split("/")[1] || "png";

    // Subir a Firebase Storage
    const storage = getStorage(app);
    const fileName = `${tenantId}_${Date.now()}.${extension}`;
    const storagePath = `tenant-logos/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
      customMetadata: {
        tenantId: tenantId,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    });

    // Obtener URL p??blica
    const downloadURL = await getDownloadURL(storageRef);

    // Actualizar en base de datos
    await query(
      `UPDATE tenants SET logo_url = $1 WHERE id = $2`,
      [downloadURL, tenantId]
    );

    return NextResponse.json({
      ok: true,
      logoURL: downloadURL
    });
  } catch (error: any) {
    console.error("[POST /api/tenant/logo] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al subir logo" },
      { status: 500 }
    );
  }
}
