import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook de Resend para emails entrantes
 * Recibe emails enviados a soporte@verifactu.business
 * Isaak analiza y responde automáticamente o escala a humano
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'kiabusiness2025@gmail.com';
const ISAAK_SUPPORT_ENABLED = process.env.ISAAK_SUPPORT_ENABLED === 'true';

type IncomingEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: any[];
  headers: Record<string, string>;
};

type EmailClassification = {
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general' | 'urgent' | 'spam';
  confidence: number;
  needsHuman: boolean;
  suggestedResponse?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export async function POST(request: NextRequest) {
  try {
    // Verificar webhook signature (Resend)
    const signature = request.headers.get('resend-signature');
    // TODO: Validar signature con webhook secret
    
    const email: IncomingEmail = await request.json();
    
    console.log('[📨 INCOMING EMAIL]', {
      from: email.from,
      subject: email.subject,
      to: email.to
    });

    // Filtrar spam básico
    if (isLikelySpam(email)) {
      console.log('[🚫 SPAM] Email marcado como spam:', email.from);
      return NextResponse.json({ success: true, action: 'spam_filtered' });
    }

    // Clasificar email con Isaak
    const classification = await classifyEmailWithIsaak(email);

    console.log('[🤖 ISAAK] Clasificación:', classification);

    // Decidir acción
    if (classification.needsHuman || classification.priority === 'critical') {
      // Escalar a humano
      await notifyAdmin(email, classification);
      await sendAutoReplyHumanNeeded(email);
      
      return NextResponse.json({
        success: true,
        action: 'escalated_to_human',
        classification
      });
    } else if (ISAAK_SUPPORT_ENABLED && classification.suggestedResponse) {
      // Isaak responde automáticamente
      await sendIsaakResponse(email, classification.suggestedResponse);
      
      // Notificar al admin (solo log)
      await logToAdmin(email, classification, 'auto_responded');
      
      return NextResponse.json({
        success: true,
        action: 'auto_responded',
        classification
      });
    } else {
      // Respuesta genérica de "recibido"
      await sendAckResponse(email);
      await notifyAdmin(email, classification);
      
      return NextResponse.json({
        success: true,
        action: 'acknowledged',
        classification
      });
    }

  } catch (error) {
    console.error('[❌ ERROR] Processing incoming email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

/**
 * Clasificar email con Isaak (OpenAI)
 */
async function classifyEmailWithIsaak(email: IncomingEmail): Promise<EmailClassification> {
  if (!OPENAI_API_KEY) {
    return {
      category: 'general',
      confidence: 0,
      needsHuman: true,
      priority: 'medium'
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Eres Isaak, asistente de soporte de Verifactu Business (SaaS de contabilidad y facturación).

Analiza el email y clasifícalo:
- category: technical | billing | feature_request | bug_report | general | urgent | spam
- confidence: 0-1 (qué tan seguro estás de la categoría)
- needsHuman: true si requiere intervención humana
- priority: low | medium | high | critical
- suggestedResponse: respuesta profesional y útil (si puedes responder)

Responde automáticamente si:
- Pregunta sobre cómo usar la plataforma (tutorial)
- Duda sobre VeriFactu (normativa española)
- Recuperación de contraseña
- Consulta de precios/planes
- Preguntas frecuentes

Escala a humano si:
- Problema técnico complejo
- Solicitud de reembolso
- Queja seria
- Datos sensibles involucrados
- Tono urgente o frustrado

Responde SOLO con JSON válido.`
          },
          {
            role: 'user',
            content: `De: ${email.from}
Asunto: ${email.subject}

${email.text}

Clasifica este email y sugiere una respuesta si procede.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      category: result.category || 'general',
      confidence: result.confidence || 0.5,
      needsHuman: result.needsHuman || false,
      suggestedResponse: result.suggestedResponse,
      priority: result.priority || 'medium'
    };

  } catch (error) {
    console.error('[ISAAK] Error clasificando email:', error);
    return {
      category: 'general',
      confidence: 0,
      needsHuman: true,
      priority: 'medium'
    };
  }
}

/**
 * Detectar spam básico
 */
function isLikelySpam(email: IncomingEmail): boolean {
  const spamKeywords = [
    'viagra', 'casino', 'lottery', 'prince', 'inheritance',
    'click here now', 'act now', 'limited time', 'congratulations you won'
  ];
  
  const content = `${email.subject} ${email.text}`.toLowerCase();
  return spamKeywords.some(keyword => content.includes(keyword));
}

/**
 * Enviar respuesta automática de Isaak
 */
async function sendIsaakResponse(email: IncomingEmail, response: string) {
  if (!RESEND_API_KEY) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0b6cfb 0%, #2bb2ff 100%); padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0;">🤖 Respuesta Automática de Isaak</h2>
      </div>
      
      <div style="padding: 32px; background: white;">
        <p>Hola,</p>
        
        <p>Gracias por contactar con Verifactu Business. He analizado tu consulta y aquí está mi respuesta:</p>
        
        <div style="background: #f8f9fa; border-left: 4px solid #0b6cfb; padding: 16px; margin: 24px 0;">
          ${response.replace(/\n/g, '<br>')}
        </div>
        
        <p>Si esta respuesta no resuelve completamente tu duda o necesitas más ayuda, no dudes en responder a este email. Un miembro de nuestro equipo lo revisará.</p>
        
        <p>Saludos,<br><strong>Isaak</strong><br>Asistente Inteligente de Soporte<br>Verifactu Business</p>
      </div>
      
      <div style="padding: 16px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6b7c8a;">
        <p>Esta es una respuesta automática generada por IA. Si necesitas asistencia humana, simplemente responde a este email.</p>
        <p><a href="mailto:soporte@verifactu.business" style="color: #0b6cfb;">soporte@verifactu.business</a></p>
      </div>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Isaak - Verifactu <soporte@verifactu.business>',
      to: email.from,
      subject: `Re: ${email.subject}`,
      html,
      reply_to: 'soporte@verifactu.business'
    })
  });

  console.log('[✅ SENT] Auto-respuesta de Isaak a:', email.from);
}

/**
 * Enviar respuesta de "necesita humano"
 */
async function sendAutoReplyHumanNeeded(email: IncomingEmail) {
  if (!RESEND_API_KEY) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 32px; background: white;">
        <h2 style="color: #0b6cfb;">Hemos recibido tu mensaje</h2>
        
        <p>Hola,</p>
        
        <p>Gracias por contactar con Verifactu Business. Tu consulta ha sido recibida y requiere la atención de nuestro equipo técnico.</p>
        
        <p><strong>Tiempo de respuesta estimado:</strong> Menos de 2 horas en horario laboral</p>
        
        <p>Nuestro equipo está revisando tu caso y te responderemos lo antes posible.</p>
        
        <p>Saludos,<br><strong>Equipo Verifactu Business</strong></p>
      </div>
      
      <div style="padding: 16px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6b7c8a;">
        <p><a href="mailto:soporte@verifactu.business" style="color: #0b6cfb;">soporte@verifactu.business</a></p>
      </div>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Verifactu Business <soporte@verifactu.business>',
      to: email.from,
      subject: `Re: ${email.subject}`,
      html
    })
  });
}

/**
 * Respuesta de acuse de recibo genérica
 */
async function sendAckResponse(email: IncomingEmail) {
  // Similar a sendAutoReplyHumanNeeded pero más genérica
  await sendAutoReplyHumanNeeded(email);
}

/**
 * Notificar al admin (escalamiento)
 */
async function notifyAdmin(email: IncomingEmail, classification: EmailClassification) {
  if (!RESEND_API_KEY) return;

  const priorityEmoji = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${classification.priority === 'critical' ? '#dc2626' : '#f59e0b'}; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0;">${priorityEmoji[classification.priority]} Email Requiere Atención</h2>
      </div>
      
      <div style="padding: 32px; background: white;">
        <h3>Nuevo email de soporte</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; background: #f8f9fa; font-weight: bold; width: 120px;">De:</td>
            <td style="padding: 8px;">${email.from}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Asunto:</td>
            <td style="padding: 8px;">${email.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Categoría:</td>
            <td style="padding: 8px;">${classification.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Prioridad:</td>
            <td style="padding: 8px;"><strong>${classification.priority.toUpperCase()}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Confianza:</td>
            <td style="padding: 8px;">${(classification.confidence * 100).toFixed(0)}%</td>
          </tr>
        </table>
        
        <h4>Mensaje:</h4>
        <div style="background: #f8f9fa; padding: 16px; border-left: 4px solid #0b6cfb; margin: 16px 0; white-space: pre-wrap;">${email.text}</div>
        
        <p><strong>Acción requerida:</strong> Responder manualmente a ${email.from}</p>
        
        <a href="mailto:${email.from}?subject=Re: ${encodeURIComponent(email.subject)}" style="display: inline-block; background: #0b6cfb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Responder Ahora
        </a>
      </div>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Isaak Alerts <soporte@verifactu.business>',
      to: ADMIN_EMAIL,
      subject: `[${classification.priority.toUpperCase()}] Email de Soporte: ${email.subject}`,
      html
    })
  });

  console.log('[📧 ADMIN] Notificación enviada a:', ADMIN_EMAIL);
}

/**
 * Log al admin (informativo, no urgente)
 */
async function logToAdmin(email: IncomingEmail, classification: EmailClassification, action: string) {
  // Solo enviar un resumen diario o cuando se acumulen varios
  // Por ahora, solo logging
  console.log('[📊 LOG]', {
    from: email.from,
    subject: email.subject,
    action,
    classification: classification.category,
    priority: classification.priority
  });
}
