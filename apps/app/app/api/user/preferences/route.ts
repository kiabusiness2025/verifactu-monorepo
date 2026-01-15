import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Obtener preferencias del usuario
    const result = await query(
      `SELECT isaak_tone, chat_history_enabled, voice_enabled
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.length === 0) {
      // Si no existen preferencias, crear con valores por defecto
      await query(
        `INSERT INTO user_preferences (user_id, isaak_tone, chat_history_enabled, voice_enabled)
         VALUES ($1, 'friendly', true, false)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      return NextResponse.json({
        isaak_tone: "friendly",
        chat_history_enabled: true,
        voice_enabled: false,
      });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Error al cargar preferencias" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { isaak_tone, chat_history_enabled, voice_enabled } = body;

    // Validar isaak_tone si se proporciona
    if (isaak_tone && !["friendly", "professional", "minimal"].includes(isaak_tone)) {
      return NextResponse.json(
        { error: "Tono inválido. Debe ser: friendly, professional o minimal" },
        { status: 400 }
      );
    }

    // Construir query de actualización dinámica
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (isaak_tone !== undefined) {
      updates.push(`isaak_tone = $${paramCount++}`);
      values.push(isaak_tone);
    }

    if (chat_history_enabled !== undefined) {
      updates.push(`chat_history_enabled = $${paramCount++}`);
      values.push(chat_history_enabled);
    }

    if (voice_enabled !== undefined) {
      updates.push(`voice_enabled = $${paramCount++}`);
      values.push(voice_enabled);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(userId);

    // Actualizar o insertar
    await query(
      `INSERT INTO user_preferences (user_id, isaak_tone, chat_history_enabled, voice_enabled)
       VALUES ($${values.length}, $1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET ${updates.join(", ")}, updated_at = NOW()`,
      values
    );

    return NextResponse.json({ ok: true, message: "Preferencias actualizadas" });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Error al guardar preferencias" },
      { status: 500 }
    );
  }
}
