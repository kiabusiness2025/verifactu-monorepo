import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';

const leadSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email invalido'),
  company: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = await checkRateLimit({
    key: `send-lead:${ip}`,
    limit: 5,
    windowSeconds: 10 * 60,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiados envíos. Inténtalo de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();

    const validationResult = leadSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos' },
        { status: 400 }
      );
    }

    const { name, email, company, message } = validationResult.data;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      if (process.env.NODE_ENV === 'development') {
        console.log('Lead received (dev mode):', { name, email, company, message });
        return NextResponse.json({
          success: true,
          message: 'Lead recibido correctamente (modo desarrollo)',
        });
      }
      return NextResponse.json({ error: 'Servicio de email no configurado' }, { status: 500 });
    }

    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const resend = new Resend(resendApiKey);

    const emailContent = `
      <h2>Nuevo Lead de Verifactu</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${company ? `<p><strong>Empresa:</strong> ${escapeHtml(company)}</p>` : ''}
      ${message ? `<p><strong>Mensaje:</strong></p><p>${escapeHtml(message)}</p>` : ''}
    `;

    const recipientEmail = process.env.LEAD_EMAIL || 'soporte@verifactu.business';

    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'info@verifactu.business',
      to: recipientEmail,
      subject: `Nuevo lead: ${escapeHtml(name)}`,
      html: emailContent,
    });

    return NextResponse.json({
      success: true,
      message: 'Lead enviado correctamente',
    });
  } catch (error) {
    console.error('Error processing lead:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
