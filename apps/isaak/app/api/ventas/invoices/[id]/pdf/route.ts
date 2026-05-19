import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
}

function readBranding(adminEditHistory: unknown): {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
} {
  const fallback = { logoUrl: null, primaryColor: '#2361D8', secondaryColor: '#0F172A' };
  if (
    !adminEditHistory ||
    typeof adminEditHistory !== 'object' ||
    Array.isArray(adminEditHistory)
  ) {
    return fallback;
  }
  const root = adminEditHistory as Record<string, unknown>;
  const raw = root.branding;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const b = raw as Record<string, unknown>;
  const logoUrl = typeof b.logoUrl === 'string' && b.logoUrl.trim() ? b.logoUrl.trim() : null;
  return {
    logoUrl,
    primaryColor: normalizeHexColor(b.primaryColor, fallback.primaryColor),
    secondaryColor: normalizeHexColor(b.secondaryColor, fallback.secondaryColor),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ ok: false, error: 'ID de factura no válido' }, { status: 400 });
  }

  const [invoice, tenantProfile, defaultTemplate] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId },
      select: {
        id: true,
        number: true,
        issueDate: true,
        customerName: true,
        customerNif: true,
        amountGross: true,
        amountTax: true,
        amountNet: true,
        currency: true,
        notes: true,
        verifactuHash: true,
        verifactuQr: true,
        verifactuStatus: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        legalName: true,
        tradeName: true,
        taxId: true,
        address: true,
        postalCode: true,
        city: true,
        province: true,
        country: true,
        adminEditHistory: true,
      },
    }),
    prisma.invoiceTemplate.findFirst({
      where: { tenantId: session.tenantId, isDefault: true },
      select: { primaryColor: true, secondaryColor: true, accentColor: true, logoUrl: true },
    }),
  ]);

  if (!invoice) {
    return NextResponse.json({ ok: false, error: 'Factura no encontrada' }, { status: 404 });
  }

  // Tenant's saved template takes precedence over admin-set branding
  const templateBranding = defaultTemplate
    ? {
        primaryColor: defaultTemplate.primaryColor ?? undefined,
        secondaryColor: defaultTemplate.secondaryColor ?? undefined,
        logoUrl: defaultTemplate.logoUrl ?? undefined,
      }
    : null;
  const adminBranding = readBranding(tenantProfile?.adminEditHistory);
  const branding = templateBranding
    ? {
        ...adminBranding,
        ...Object.fromEntries(Object.entries(templateBranding).filter(([, v]) => v != null)),
      }
    : adminBranding;

  const issuerName =
    tenantProfile?.legalName || tenantProfile?.tradeName || invoice.tenant.name || '';
  const issuerNif = tenantProfile?.taxId || '';
  const addressParts = [
    tenantProfile?.address,
    tenantProfile?.postalCode,
    tenantProfile?.city,
    tenantProfile?.province,
    tenantProfile?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const amountGross = Number(invoice.amountGross ?? 0);
  const amountTax = Number(invoice.amountTax ?? 0);
  const amountNet = Number(invoice.amountNet ?? 0);
  const taxRate = amountNet > 0 ? Math.round((amountTax / amountNet) * 100) : 21;

  const pdfPayload = {
    id: invoice.id,
    number: invoice.number,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    issuer: {
      name: issuerName,
      nif: issuerNif,
      address: addressParts,
    },
    customer: {
      name: invoice.customerName,
      nif: invoice.customerNif ?? '',
    },
    description: invoice.notes || `Factura ${invoice.number}`,
    tax: {
      rate: taxRate,
      amount: amountTax,
    },
    total: amountGross,
    currency: invoice.currency ?? 'EUR',
    verifactu_hash: invoice.verifactuHash ?? '',
    verifactu_qr: invoice.verifactuQr ?? '',
    verifactu_status: invoice.verifactuStatus ?? '',
    branding,
  };

  const apiBase = (
    process.env.VERIFACTU_API_URL ||
    process.env.API_BASE ||
    'https://api.verifactu.business'
  ).replace(/\/$/, '');

  const pdfRes = await fetch(`${apiBase}/api/verifactu/invoice-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pdfPayload),
    cache: 'no-store',
  });

  if (!pdfRes.ok) {
    const errBody = (await pdfRes.json().catch(() => ({}))) as { error?: string };
    return NextResponse.json(
      { ok: false, error: errBody?.error || 'No se pudo generar el PDF' },
      { status: 500 }
    );
  }

  const pdfBuffer = await pdfRes.arrayBuffer();
  const safeNumber = invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_');

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeNumber}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
