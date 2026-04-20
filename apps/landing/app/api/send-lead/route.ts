import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';
import { notifyLandingLead, persistLandingLead } from '../../lib/leadIntake';

const leadSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email invalido'),
  companyName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
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

    const { name, email, companyName, company, phone, message } = validationResult.data;

    const result = await persistLandingLead(request, {
      flow: 'contact',
      name,
      email,
      companyName: companyName?.trim() || company?.trim() || null,
      phone: phone?.trim() || null,
      message: message?.trim() || null,
    });

    try {
      await notifyLandingLead(result);
    } catch (notificationError) {
      console.error('lead notification failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Lead enviado correctamente',
    });
  } catch (error) {
    console.error('Error processing lead:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
