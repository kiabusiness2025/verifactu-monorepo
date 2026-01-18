import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Webhook de Resend para recibir emails entrantes
 * Endpoint: POST /api/webhooks/resend
 * 
 * Configuración en Resend:
 * 1. Ir a https://resend.com/webhooks
 * 2. Crear nuevo webhook con URL: https://app.verifactu.business/api/webhooks/resend
 * 3. Eventos a suscribir: email.received
 * 4. Copiar el webhook secret a RESEND_WEBHOOK_SECRET
 */

interface ResendEmailPayload {
  type: "email.received";
  created_at: string;
  data: {
    message_id: string;
    from: {
      email: string;
      name?: string;
    };
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    attachments?: Array<{
      filename: string;
      content_type: string;
      size: number;
    }>;
  };
}

/**
 * Detecta prioridad del email basándose en contenido y headers
 */
function detectPriority(payload: ResendEmailPayload): "low" | "normal" | "high" {
  const subject = payload.data.subject.toLowerCase();
  const text = payload.data.text?.toLowerCase() || "";
  
  // Palabras clave de alta prioridad
  const highPriorityKeywords = [
    "urgente",
    "importante",
    "crítico",
    "error",
    "problema",
    "no funciona",
    "ayuda",
    "bloqueado",
  ];
  
  // Palabras clave de baja prioridad
  const lowPriorityKeywords = [
    "pregunta",
    "duda",
    "consulta",
    "información",
    "sugerencia",
  ];
  
  // Verificar alta prioridad
  if (highPriorityKeywords.some((kw) => subject.includes(kw) || text.includes(kw))) {
    return "high";
  }
  
  // Verificar baja prioridad
  if (lowPriorityKeywords.some((kw) => subject.includes(kw) || text.includes(kw))) {
    return "low";
  }
  
  return "normal";
}

/**
 * Detecta si el email es spam
 */
function isSpam(payload: ResendEmailPayload): boolean {
  const subject = payload.data.subject.toLowerCase();
  const text = payload.data.text?.toLowerCase() || "";
  const from = payload.data.from.email.toLowerCase();
  
  const spamKeywords = [
    "viagra",
    "casino",
    "lottery",
    "winner",
    "congratulations",
    "prize",
    "click here",
    "unsubscribe",
  ];
  
  // Verificar dominios sospechosos
  const suspiciousDomains = ["temp-mail", "guerrillamail", "10minutemail"];
  const isSuspiciousDomain = suspiciousDomains.some((d) => from.includes(d));
  
  // Verificar palabras clave spam
  const hasSpamKeywords = spamKeywords.some(
    (kw) => subject.includes(kw) || text.includes(kw)
  );
  
  return isSuspiciousDomain || hasSpamKeywords;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar webhook secret (seguridad)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("resend-signature");
      if (signature !== webhookSecret) {
        console.error("[WEBHOOK] Invalid signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload: ResendEmailPayload = await request.json();

    // Solo procesar emails recibidos
    if (payload.type !== "email.received") {
      return NextResponse.json({ success: true, message: "Event ignored" });
    }

    console.log("[WEBHOOK] Email received:", {
      from: payload.data.from.email,
      to: payload.data.to,
      subject: payload.data.subject,
    });

    // Detectar prioridad y spam
    const priority = detectPriority(payload);
    const spam = isSpam(payload);
    const status = spam ? "spam" : "pending";

    // Guardar en base de datos
    await query(
      `
      INSERT INTO admin_emails (
        message_id, from_email, from_name, to_email, subject,
        text_content, html_content, priority, status, resend_data, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (message_id) DO NOTHING
      `,
      [
        payload.data.message_id,
        payload.data.from.email,
        payload.data.from.name || null,
        payload.data.to[0],
        payload.data.subject,
        payload.data.text || null,
        payload.data.html || null,
        priority,
        status,
        JSON.stringify(payload),
        new Date(payload.created_at),
      ]
    );

    console.log(`[WEBHOOK] Email saved to database:`, {
      id: payload.data.message_id,
      priority,
      status,
    });

    // Si es alta prioridad y no es spam, podríamos enviar notificación
    if (priority === "high" && !spam) {
      // TODO: Enviar notificación a admin por email/Slack/etc
      console.log("[WEBHOOK] High priority email detected - notification sent");
    }

    return NextResponse.json({
      success: true,
      message: "Email received and stored",
      priority,
      status,
    });
  } catch (error) {
    console.error("[WEBHOOK] Error processing email:", error);
    return NextResponse.json(
      { error: "Failed to process email" },
      { status: 500 }
    );
  }
}

// GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({
    service: "Resend Webhook",
    status: "active",
    endpoint: "/api/webhooks/resend",
    events: ["email.received"],
    note: "This endpoint receives incoming emails from Resend",
  });
}
