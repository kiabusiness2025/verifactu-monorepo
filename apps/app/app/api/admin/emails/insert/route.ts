import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { Client } from "pg";

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const admin = await requireAdmin(request);

    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { from_email, from_name, to_email, subject, text_content, priority } = body;

    // Validaciones básicas
    if (!from_email || !subject || !text_content || !to_email) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Conectarse a la BD
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Insertar email de prueba
    const insertQuery = `
      INSERT INTO admin_emails (
        message_id,
        from_email,
        from_name,
        to_email,
        subject,
        text_content,
        html_content,
        priority,
        status,
        received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, message_id, from_email, subject, received_at, status;
    `;

    const messageId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await client.query(insertQuery, [
      messageId,
      from_email,
      from_name || "Usuario de Prueba",
      to_email,
      subject,
      text_content,
      null, // html_content
      priority || "normal",
      "pending",
    ]);

    await client.end();

    const insertedEmail = result.rows[0];

    return NextResponse.json({
      success: true,
      message: "Email de prueba insertado exitosamente",
      email: {
        id: insertedEmail.id,
        messageId: insertedEmail.message_id,
        from: insertedEmail.from_email,
        subject: insertedEmail.subject,
        receivedAt: insertedEmail.received_at,
        status: insertedEmail.status,
      },
    });
  } catch (error) {
    console.error("Error inserting test email:", error);
    return NextResponse.json(
      { error: "Error al insertar email de prueba" },
      { status: 500 }
    );
  }
}
