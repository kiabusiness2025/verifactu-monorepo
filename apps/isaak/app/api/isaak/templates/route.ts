import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { PREDEFINED_TEMPLATES, extractTemplateFromInvoiceImage } from '@/app/lib/invoice-templates';

export const runtime = 'nodejs';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

// GET — list tenant templates + predefined catalog
export async function GET(_req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const custom = await prisma.invoiceTemplate.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      isDefault: true,
      sourceType: true,
      predefinedSlug: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      fontFamily: true,
      logoUrl: true,
      layoutConfig: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ predefined: PREDEFINED_TEMPLATES, custom });
}

// POST — create or extract-from-image
export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';

  // Multipart: extract from uploaded invoice image
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 });

    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'Archivo máximo 5 MB' }, { status: 413 });
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type))
      return NextResponse.json({ error: 'Formato no soportado' }, { status: 415 });

    const apiKey = process.env.ISAAK_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';
    if (!apiKey) return NextResponse.json({ error: 'IA no disponible' }, { status: 503 });

    const model =
      process.env.ISAAK_AI_MODEL_CLAUDE_DEFAULT ??
      process.env.ANTHROPIC_MODEL ??
      'claude-sonnet-4-5';

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const extracted = await extractTemplateFromInvoiceImage(base64, file.type, apiKey, model).catch(
      () => null
    );

    return NextResponse.json({ ok: true, extracted: extracted ?? {} });
  }

  // JSON: save template
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    sourceType?: string;
    predefinedSlug?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    layoutConfig?: Record<string, unknown>;
    setAsDefault?: boolean;
  } | null;

  if (!body?.name) return NextResponse.json({ error: 'name requerido' }, { status: 400 });

  if (body.setAsDefault) {
    await prisma.invoiceTemplate.updateMany({
      where: { tenantId: session.tenantId },
      data: { isDefault: false },
    });
  }

  const template = await prisma.invoiceTemplate.create({
    data: {
      tenantId: session.tenantId,
      name: body.name,
      isDefault: body.setAsDefault ?? false,
      sourceType: body.sourceType ?? 'custom',
      predefinedSlug: body.predefinedSlug ?? null,
      primaryColor: body.primaryColor ?? null,
      secondaryColor: body.secondaryColor ?? null,
      accentColor: body.accentColor ?? null,
      fontFamily: body.fontFamily ?? null,
      logoUrl:
        typeof body.logoUrl === 'string' && /^https:\/\//i.test(body.logoUrl) ? body.logoUrl : null,
      layoutConfig: (body.layoutConfig ?? undefined) as
        | import('@prisma/client').Prisma.InputJsonValue
        | undefined,
    },
  });

  return NextResponse.json({ ok: true, template });
}
