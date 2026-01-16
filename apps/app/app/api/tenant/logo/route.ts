/**
 * API para gestión de logotipos de tenant (empresa)
 * 
 * GET /api/tenant/logo - Obtener logo actual del tenant
 * POST /api/tenant/logo - Subir nuevo logo a Firebase Storage
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, readSessionSecret } from "@verifactu/utils";
import { query } from "@/lib/db";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebaseClient";

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
    const sessionToken = req.cookies.get("session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const sessionSecret = readSessionSecret();
    const payload = await verifySessionToken(sessionToken, sessionSecret);

    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId requerido" }, { status: 400 });
    }

    // Verificar acceso
    const hasAccess = await verifyTenantAccess(payload.uid, tenantId);
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

/**
 * POST /api/tenant/logo
 * Subir logo del tenant a Firebase Storage
 */
export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const sessionSecret = readSessionSecret();
    const payload = await verifySessionToken(sessionToken, sessionSecret);

    const body = await req.json();
    const { tenantId, logoURL } = body;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId requerido" }, { status: 400 });
    }

    if (!logoURL) {
      return NextResponse.json({ ok: false, error: "logoURL requerido" }, { status: 400 });
    }

    // Verificar acceso
    const hasAccess = await verifyTenantAccess(payload.uid, tenantId);
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
        { ok: false, error: "Formato de imagen inválido. Use data URL o URL externa." },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Validar que es una imagen
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Solo se permiten imágenes" },
        { status: 400 }
      );
    }

    // Convertir base64 a Buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { ok: false, error: "La imagen no puede superar los 5MB" },
        { status: 400 }
      );
    }

    // Obtener extensión
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
        uploadedBy: payload.uid,
        uploadedAt: new Date().toISOString()
      }
    });

    // Obtener URL pública
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
