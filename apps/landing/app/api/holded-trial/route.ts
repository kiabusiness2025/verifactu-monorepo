import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CNAE_SECTION_CODES, HOLDED_ROLE_VALUES } from '@verifactu/utils';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';
import { notifyLandingLead, persistLandingLead } from '../../lib/leadIntake';

const holdedTrialSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().trim().email('Email invalido'),
  taxId: z.string().trim().nullable().optional(),
  roleInCompany: z.enum(HOLDED_ROLE_VALUES).nullable().optional(),
  businessSectorCode: z.enum(CNAE_SECTION_CODES).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = await checkRateLimit({
    key: `holded-trial:${ip}`,
    limit: 5,
    windowSeconds: 10 * 60,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiados envios. Intentalo de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const validationResult = holdedTrialSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos' },
        { status: 400 }
      );
    }

    const result = await persistLandingLead(request, {
      flow: 'holded_trial',
      name: validationResult.data.name,
      email: validationResult.data.email,
      taxId: validationResult.data.taxId ?? null,
      roleInCompany: validationResult.data.roleInCompany ?? null,
      businessSectorCode: validationResult.data.businessSectorCode ?? null,
    });

    try {
      await notifyLandingLead(result);
    } catch (notificationError) {
      console.error('holded trial notification failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      tenantId: result.tenantId,
      message: 'Solicitud enviada correctamente',
    });
  } catch (error) {
    console.error('Error processing holded trial:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
