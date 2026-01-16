import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@verifactu/utils";
import { readSessionSecret } from "@/lib/session";

/**
 * API para subir foto de perfil
 * 
 * Por ahora, acepta una URL de imagen (ej: desde Google, Facebook)
 * o un Data URL (base64)
 * 
 * En producción, podrías integrar con:
 * - Cloud Storage (Google Cloud Storage, AWS S3)
 * - CDN (Cloudflare Images, Cloudinary)
 */
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const secret = readSessionSecret();
    const payload = await verifySessionToken(sessionCookie, secret);
    if (!payload?.uid) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { photoURL } = body;

    if (!photoURL || typeof photoURL !== "string") {
      return NextResponse.json({ error: "Invalid photoURL" }, { status: 400 });
    }

    // Validar que sea una URL válida o data URL
    const isDataURL = photoURL.startsWith("data:image/");
    const isHTTPURL = photoURL.startsWith("http://") || photoURL.startsWith("https://");

    if (!isDataURL && !isHTTPURL) {
      return NextResponse.json(
        { error: "photoURL must be a valid URL or data URL" },
        { status: 400 }
      );
    }

    // TODO: En producción, subir a Cloud Storage y retornar URL pública
    // Por ahora, simplemente retornamos la URL tal cual
    return NextResponse.json({
      ok: true,
      photoURL,
      message: "Photo uploaded successfully",
    });
  } catch (error) {
    console.error("POST /api/user/upload-photo error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
