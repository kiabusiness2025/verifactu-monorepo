import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { loadSettingsData, parseEmployeesLabel, toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

function normalizeText(value: unknown, min = 1) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length >= min ? normalized : null;
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
}

function normalizeImageSource(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(normalized)) {
    return normalized.length <= 2_800_000 ? normalized : null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return normalized;
    }
  } catch {
    return null;
  }

  return null;
}

async function requireSession() {
  return toSettingsSession(await getHoldedSession());
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.company });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tradeName = normalizeText(body.tradeName, 2);
  const legalName = normalizeText(body.legalName, 2);
  const activityMain = normalizeText(body.activityMain, 2);
  const sector = normalizeText(body.sector, 2);
  const address = normalizeText(body.address, 2);
  const postalCode = normalizeText(body.postalCode, 2);
  const city = normalizeText(body.city, 2);
  const province = normalizeText(body.province, 2);
  const country = normalizeText(body.country, 2);
  const taxId = normalizeText(body.taxId, 2);
  const representative = normalizeText(body.representative, 2);
  const website = normalizeText(body.website, 4);
  const phone = normalizeText(body.phone, 5);
  const teamSize = normalizeText(body.teamSize, 2);
  const logoUrl = normalizeImageSource(body.logoUrl);
  const primaryColor = normalizeHexColor(body.primaryColor, '#2361D8');
  const secondaryColor = normalizeHexColor(body.secondaryColor, '#0F172A');

  const currentProfile = await prisma.tenantProfile.findUnique({
    where: { tenantId: session.tenantId },
    select: { adminEditHistory: true },
  });

  const existingMeta =
    currentProfile?.adminEditHistory &&
    typeof currentProfile.adminEditHistory === 'object' &&
    !Array.isArray(currentProfile.adminEditHistory)
      ? (currentProfile.adminEditHistory as Record<string, unknown>)
      : {};

  const mergedAdminMeta = {
    ...existingMeta,
    branding: {
      ...(existingMeta.branding &&
      typeof existingMeta.branding === 'object' &&
      !Array.isArray(existingMeta.branding)
        ? (existingMeta.branding as Record<string, unknown>)
        : {}),
      logoUrl,
      primaryColor,
      secondaryColor,
      updatedAt: new Date().toISOString(),
    },
  };

  await prisma.tenantProfile.upsert({
    where: { tenantId: session.tenantId },
    update: {
      tradeName: tradeName || undefined,
      legalName: legalName || undefined,
      cnaeText: activityMain || undefined,
      cnae: sector || undefined,
      address: address || undefined,
      postalCode: postalCode || undefined,
      city: city || undefined,
      province: province || undefined,
      country: country || undefined,
      taxId: taxId || undefined,
      representative: representative || undefined,
      website: website || undefined,
      phone: phone || undefined,
      employees: parseEmployeesLabel(teamSize),
      adminEditHistory: mergedAdminMeta,
    },
    create: {
      tenantId: session.tenantId,
      source: 'manual',
      tradeName: tradeName || undefined,
      legalName: legalName || undefined,
      cnaeText: activityMain || undefined,
      cnae: sector || undefined,
      address: address || undefined,
      postalCode: postalCode || undefined,
      city: city || undefined,
      province: province || undefined,
      country: country || undefined,
      taxId: taxId || undefined,
      representative: representative || undefined,
      website: website || undefined,
      phone: phone || undefined,
      employees: parseEmployeesLabel(teamSize),
      adminEditHistory: mergedAdminMeta,
    },
  });

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.company });
}
