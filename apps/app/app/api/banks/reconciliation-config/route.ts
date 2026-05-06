import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_CONFIG = {
  amountToleranceEur: 1,
  dateWindowDays: 3,
  confidenceThreshold: 0.85,
  autoMatchEnabled: true,
} as const;

const LIMITS = {
  amountToleranceEur: { min: 0, max: 1000 },
  dateWindowDays: { min: 0, max: 60 },
  confidenceThreshold: { min: 0.5, max: 1 },
} as const;

function toPublicConfig(config: {
  amountToleranceEur: unknown;
  dateWindowDays: number;
  confidenceThreshold: number;
  autoMatchEnabled: boolean;
}) {
  return {
    amountToleranceEur: Number(config.amountToleranceEur),
    dateWindowDays: config.dateWindowDays,
    confidenceThreshold: config.confidenceThreshold,
    autoMatchEnabled: config.autoMatchEnabled,
  };
}

function parseFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export async function GET() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = await prisma.bankReconciliationConfig.findUnique({
    where: { tenantId: auth.tenantId },
    select: {
      amountToleranceEur: true,
      dateWindowDays: true,
      confidenceThreshold: true,
      autoMatchEnabled: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    tenantId: auth.tenantId,
    source: config ? 'tenant' : 'defaults',
    config: config ? toPublicConfig(config) : DEFAULT_CONFIG,
    updatedAt: config?.updatedAt ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    amountToleranceEur?: unknown;
    dateWindowDays?: unknown;
    confidenceThreshold?: unknown;
    autoMatchEnabled?: unknown;
  };

  const updateData: {
    amountToleranceEur?: number;
    dateWindowDays?: number;
    confidenceThreshold?: number;
    autoMatchEnabled?: boolean;
  } = {};

  if (body.amountToleranceEur !== undefined) {
    const amountToleranceEur = parseFiniteNumber(body.amountToleranceEur);
    if (
      amountToleranceEur === null ||
      !isInRange(amountToleranceEur, LIMITS.amountToleranceEur.min, LIMITS.amountToleranceEur.max)
    ) {
      return NextResponse.json(
        {
          error: 'amountToleranceEur fuera de rango',
          range: LIMITS.amountToleranceEur,
        },
        { status: 400 }
      );
    }
    updateData.amountToleranceEur = amountToleranceEur;
  }

  if (body.dateWindowDays !== undefined) {
    const dateWindowDays = parseFiniteNumber(body.dateWindowDays);
    if (
      dateWindowDays === null ||
      !Number.isInteger(dateWindowDays) ||
      !isInRange(dateWindowDays, LIMITS.dateWindowDays.min, LIMITS.dateWindowDays.max)
    ) {
      return NextResponse.json(
        {
          error: 'dateWindowDays fuera de rango',
          range: LIMITS.dateWindowDays,
        },
        { status: 400 }
      );
    }
    updateData.dateWindowDays = dateWindowDays;
  }

  if (body.confidenceThreshold !== undefined) {
    const confidenceThreshold = parseFiniteNumber(body.confidenceThreshold);
    if (
      confidenceThreshold === null ||
      !isInRange(
        confidenceThreshold,
        LIMITS.confidenceThreshold.min,
        LIMITS.confidenceThreshold.max
      )
    ) {
      return NextResponse.json(
        {
          error: 'confidenceThreshold fuera de rango',
          range: LIMITS.confidenceThreshold,
        },
        { status: 400 }
      );
    }
    updateData.confidenceThreshold = confidenceThreshold;
  }

  if (body.autoMatchEnabled !== undefined) {
    if (typeof body.autoMatchEnabled !== 'boolean') {
      return NextResponse.json({ error: 'autoMatchEnabled debe ser boolean' }, { status: 400 });
    }
    updateData.autoMatchEnabled = body.autoMatchEnabled;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No se enviaron campos validos para actualizar' },
      { status: 400 }
    );
  }

  const saved = await prisma.bankReconciliationConfig.upsert({
    where: { tenantId: auth.tenantId },
    create: {
      tenantId: auth.tenantId,
      amountToleranceEur: updateData.amountToleranceEur ?? DEFAULT_CONFIG.amountToleranceEur,
      dateWindowDays: updateData.dateWindowDays ?? DEFAULT_CONFIG.dateWindowDays,
      confidenceThreshold: updateData.confidenceThreshold ?? DEFAULT_CONFIG.confidenceThreshold,
      autoMatchEnabled: updateData.autoMatchEnabled ?? DEFAULT_CONFIG.autoMatchEnabled,
    },
    update: updateData,
    select: {
      amountToleranceEur: true,
      dateWindowDays: true,
      confidenceThreshold: true,
      autoMatchEnabled: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    tenantId: auth.tenantId,
    config: toPublicConfig(saved),
    updatedAt: saved.updatedAt,
  });
}
