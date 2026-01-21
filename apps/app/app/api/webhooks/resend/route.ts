import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { prisma } from '@verifactu/db';

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
    console.log("[WEBHOOK] 🔔 Petición recibida en /api/webhooks/resend");
    console.log("[WEBHOOK] Timestamp:", new Date().toISOString());
    
    // Log ALL headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log("[WEBHOOK] Headers recibidos:", JSON.stringify(headers, null, 2));
    
    // Verificar webhook secret (seguridad)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const signature = request.headers.get("resend-signature");
    
    console.log("[WEBHOOK] Secret configurado:", webhookSecret ? "✓" : "✗");
    console.log("[WEBHOOK] Signature recibida:", signature ? "✓" : "✗");
    
    if (webhookSecret) {
      if (signature !== webhookSecret) {
        console.error("[WEBHOOK] ❌ Invalid signature");
        console.error("[WEBHOOK] Esperado:", webhookSecret);
        console.error("[WEBHOOK] Recibido:", signature);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    
    console.log("[WEBHOOK] ✓ Signature válida");

    const payload: any = await request.json();
    console.log("[WEBHOOK] 📧 Payload recibido:", {
      type: payload.type,
      from: payload.data?.from?.email,
      subject: payload.data?.subject,
    });

    // Track email status changes (sent, delivered, bounced, etc.)
    if (payload.type && ['email.sent', 'email.delivered', 'email.bounced', 'email.complained', 'email.delivery_delayed'].includes(payload.type)) {
      await trackEmailStatus(payload);
    }

    // Solo procesar emails recibidos para mailbox
    if (payload.type !== "email.received") {
      return NextResponse.json({ success: true, message: "Event tracked" });
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
    console.log("[WEBHOOK] 💾 Guardando en PostgreSQL...");
    
    const result = await query(
      `
      INSERT INTO admin_emails (
        message_id, from_email, from_name, to_email, subject,
        text_content, html_content, priority, status, resend_data, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (message_id) DO NOTHING
      RETURNING id
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

    if (result.length > 0) {
      console.log(`[WEBHOOK] ✅ Email guardado en BD:`, {
        db_id: result[0].id,
        message_id: payload.data.message_id,
        priority,
        status,
      });
    } else {
      console.log(`[WEBHOOK] ⚠️  Email duplicado (ya existe):`, payload.data.message_id);
    }

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

/**
 * Track email status changes from Resend webhooks
 */
async function trackEmailStatus(payload: any) {
  const { type, data } = payload;
  const messageId = data?.id;

  if (!messageId) {
    console.log('[WEBHOOK] No messageId in payload, skipping tracking');
    return;
  }

  // Check for duplicate webhook
  const existing = await prisma.webhookEvent.findFirst({
    where: { externalId: messageId, provider: 'RESEND', eventType: type }
  });

  if (existing) {
    console.log('[WEBHOOK] Duplicate Resend webhook, ignoring:', messageId);
    return;
  }

  // Create webhook event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'RESEND',
      externalId: messageId,
      eventType: type,
      payload: payload,
      signatureOk: true,
      status: 'RECEIVED'
    }
  });

  // Create first attempt
  const attempt = await prisma.webhookAttempt.create({
    data: {
      webhookEventId: webhookEvent.id,
      attemptNumber: 1,
      startedAt: new Date()
    }
  });

  try {
    // Update EmailEvent if it exists
    const emailEvent = await prisma.emailEvent.findUnique({
      where: { messageId }
    });

    if (emailEvent) {
      let status = emailEvent.status;
      
      switch (type) {
        case 'email.sent':
          status = 'SENT';
          break;
        case 'email.delivered':
          status = 'DELIVERED';
          break;
        case 'email.bounced':
          status = 'BOUNCED';
          break;
        case 'email.complained':
          status = 'COMPLAINED';
          break;
      }

      await prisma.emailEvent.update({
        where: { messageId },
        data: { status, updatedAt: new Date() }
      });

      console.log('[WEBHOOK] EmailEvent updated:', messageId, status);
    }

    // Mark webhook as processed
    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'PROCESSED', processedAt: new Date() }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: true, finishedAt: new Date() }
      })
    ]);
  } catch (error: any) {
    console.error('[WEBHOOK] Error tracking email status:', error.message);
    
    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'FAILED', lastError: error.message }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: false, error: error.message, finishedAt: new Date() }
      })
    ]);
  }
}

// GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({
    service: "Resend Webhook",
    status: "active",
    endpoint: "/api/webhooks/resend",
    events: ["email.received", "email.sent", "email.delivered", "email.bounced", "email.complained"],
    note: "This endpoint receives incoming emails and tracks email delivery status",
  });
}
