// F11 fase 4 — Tax returns service (IsaakTaxReturn).
//
// CRUD + helpers para los modelos tributarios. Mantiene la
// invariante de aislamiento estricto: tenantId es SIEMPRE filtro en
// cualquier query.
//
// Validación pura (sin Prisma) en `validateTaxReturnInput` para que
// los tests cubran las reglas sin DB.

import { prisma } from './prisma';

export const TAX_RETURN_MODELS = [
  '303', '130', '111', '115', '180', '190',
  '200', '202', '347', '349', '390', '720', '100', '714',
] as const;
export type TaxReturnModel = (typeof TAX_RETURN_MODELS)[number];

export const TAX_RETURN_STATUSES = [
  'draft', 'presented', 'accepted', 'rejected', 'rectified',
] as const;
export type TaxReturnStatus = (typeof TAX_RETURN_STATUSES)[number];

const PERIOD_REGEX = /^(Q[1-4]-\d{4}|M(0[1-9]|1[0-2])-\d{4}|A-\d{4})$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_REGEX = /^-?\d+(\.\d+)?$/;

export type TaxReturnInput = {
  tenantId: string;
  model: TaxReturnModel;
  period: string; // 'Q1-2026' | 'M03-2026' | 'A-2025'
  status?: TaxReturnStatus;
  amountDeclared: string;
  amountToPay?: string | null;
  amountToRefund?: string | null;
  presentedAt?: string | null; // ISO datetime or YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
  referenceNumber?: string | null;
  attachmentUrl?: string | null;
  notes?: string | null;
  createdBy: string;
};

export type NormalizedTaxReturnInput = Required<
  Omit<
    TaxReturnInput,
    'amountToPay' | 'amountToRefund' | 'presentedAt' | 'dueDate' | 'referenceNumber' | 'attachmentUrl' | 'notes' | 'status'
  >
> & {
  status: TaxReturnStatus;
  amountToPay: string | null;
  amountToRefund: string | null;
  presentedAt: Date | null;
  dueDate: Date | null;
  referenceNumber: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  fiscalYear: number;
};

export function deriveFiscalYear(period: string): number {
  const m = period.match(/(\d{4})$/);
  if (!m) throw new Error(`Cannot derive fiscalYear from period "${period}"`);
  return Number.parseInt(m[1]!, 10);
}

export function validateTaxReturnInput(
  input: TaxReturnInput
): NormalizedTaxReturnInput {
  if (!input.tenantId || !/^[0-9a-f-]{36}$/i.test(input.tenantId)) {
    throw new Error('validateTaxReturnInput: tenantId must be a UUID');
  }
  if (!TAX_RETURN_MODELS.includes(input.model)) {
    throw new Error(`validateTaxReturnInput: invalid model "${input.model}"`);
  }
  if (!PERIOD_REGEX.test(input.period)) {
    throw new Error(
      `validateTaxReturnInput: period must be Q1-2026, M03-2026 or A-2025 (got "${input.period}")`,
    );
  }
  const status = input.status ?? 'draft';
  if (!TAX_RETURN_STATUSES.includes(status)) {
    throw new Error(`validateTaxReturnInput: invalid status "${status}"`);
  }
  if (!DECIMAL_REGEX.test(input.amountDeclared)) {
    throw new Error('validateTaxReturnInput: amountDeclared must be a decimal string');
  }
  for (const [k, v] of [
    ['amountToPay', input.amountToPay],
    ['amountToRefund', input.amountToRefund],
  ] as const) {
    if (v !== undefined && v !== null && !DECIMAL_REGEX.test(v)) {
      throw new Error(`validateTaxReturnInput: ${k} must be decimal or null`);
    }
  }
  if (input.dueDate && !ISO_DATE_REGEX.test(input.dueDate)) {
    throw new Error('validateTaxReturnInput: dueDate must be YYYY-MM-DD or null');
  }
  if (!input.createdBy?.trim()) {
    throw new Error('validateTaxReturnInput: createdBy is required');
  }
  const fiscalYear = deriveFiscalYear(input.period);

  // Si status='presented'/'accepted' y no hay presentedAt, lo
  // marcamos como ahora (compat). Sino respetamos el valor.
  let presentedAt: Date | null = null;
  if (input.presentedAt) {
    presentedAt = new Date(input.presentedAt);
    if (Number.isNaN(presentedAt.getTime())) {
      throw new Error('validateTaxReturnInput: presentedAt is not a valid date');
    }
  } else if (status === 'presented' || status === 'accepted') {
    presentedAt = new Date();
  }

  return {
    tenantId: input.tenantId,
    model: input.model,
    period: input.period,
    fiscalYear,
    status,
    amountDeclared: input.amountDeclared,
    amountToPay: input.amountToPay ?? null,
    amountToRefund: input.amountToRefund ?? null,
    presentedAt,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    referenceNumber: input.referenceNumber ?? null,
    attachmentUrl: input.attachmentUrl ?? null,
    notes: input.notes ?? null,
    createdBy: input.createdBy.trim(),
  };
}

export type TaxReturnRow = {
  id: string;
  model: TaxReturnModel;
  period: string;
  fiscalYear: number;
  status: TaxReturnStatus;
  amountDeclared: string;
  amountToPay: string | null;
  amountToRefund: string | null;
  presentedAt: string | null; // ISO
  dueDate: string | null; // YYYY-MM-DD
  referenceNumber: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// UPSERT por (tenantId, model, period). Si ya existe lo actualiza.
export async function upsertTaxReturn(input: TaxReturnInput): Promise<{
  id: string;
  isNew: boolean;
}> {
  const norm = validateTaxReturnInput(input);

  const existing = await prisma.isaakTaxReturn.findUnique({
    where: {
      tenantId_model_period: {
        tenantId: norm.tenantId,
        model: norm.model,
        period: norm.period,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.isaakTaxReturn.update({
      where: { id: existing.id },
      data: {
        status: norm.status,
        amountDeclared: norm.amountDeclared,
        amountToPay: norm.amountToPay,
        amountToRefund: norm.amountToRefund,
        presentedAt: norm.presentedAt,
        dueDate: norm.dueDate,
        referenceNumber: norm.referenceNumber,
        attachmentUrl: norm.attachmentUrl,
        notes: norm.notes,
      },
    });
    return { id: existing.id, isNew: false };
  }

  const created = await prisma.isaakTaxReturn.create({
    data: {
      tenantId: norm.tenantId,
      model: norm.model,
      period: norm.period,
      fiscalYear: norm.fiscalYear,
      status: norm.status,
      amountDeclared: norm.amountDeclared,
      amountToPay: norm.amountToPay,
      amountToRefund: norm.amountToRefund,
      presentedAt: norm.presentedAt,
      dueDate: norm.dueDate,
      referenceNumber: norm.referenceNumber,
      attachmentUrl: norm.attachmentUrl,
      notes: norm.notes,
      createdBy: norm.createdBy,
    },
    select: { id: true },
  });
  return { id: created.id, isNew: true };
}

export async function listTaxReturns(input: {
  tenantId: string;
  fiscalYear?: number;
  model?: TaxReturnModel;
  status?: TaxReturnStatus;
}): Promise<TaxReturnRow[]> {
  const where: {
    tenantId: string;
    fiscalYear?: number;
    model?: TaxReturnModel;
    status?: TaxReturnStatus;
  } = { tenantId: input.tenantId };
  if (input.fiscalYear !== undefined) where.fiscalYear = input.fiscalYear;
  if (input.model) where.model = input.model;
  if (input.status) where.status = input.status;

  const rows = await prisma.isaakTaxReturn.findMany({
    where,
    orderBy: [{ fiscalYear: 'desc' }, { period: 'desc' }],
  });

  return rows.map((r) => ({
    id: r.id,
    model: r.model as TaxReturnModel,
    period: r.period,
    fiscalYear: r.fiscalYear,
    status: r.status as TaxReturnStatus,
    amountDeclared: r.amountDeclared.toString(),
    amountToPay: r.amountToPay?.toString() ?? null,
    amountToRefund: r.amountToRefund?.toString() ?? null,
    presentedAt: r.presentedAt ? r.presentedAt.toISOString() : null,
    dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
    referenceNumber: r.referenceNumber,
    attachmentUrl: r.attachmentUrl,
    notes: r.notes,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getTaxReturn(input: {
  tenantId: string;
  id: string;
}): Promise<TaxReturnRow | null> {
  const r = await prisma.isaakTaxReturn.findFirst({
    where: { tenantId: input.tenantId, id: input.id },
  });
  if (!r) return null;
  return {
    id: r.id,
    model: r.model as TaxReturnModel,
    period: r.period,
    fiscalYear: r.fiscalYear,
    status: r.status as TaxReturnStatus,
    amountDeclared: r.amountDeclared.toString(),
    amountToPay: r.amountToPay?.toString() ?? null,
    amountToRefund: r.amountToRefund?.toString() ?? null,
    presentedAt: r.presentedAt ? r.presentedAt.toISOString() : null,
    dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
    referenceNumber: r.referenceNumber,
    attachmentUrl: r.attachmentUrl,
    notes: r.notes,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function deleteTaxReturn(input: {
  tenantId: string;
  id: string;
}): Promise<{ deleted: number }> {
  const result = await prisma.isaakTaxReturn.deleteMany({
    where: { tenantId: input.tenantId, id: input.id },
  });
  return { deleted: result.count };
}

// ── Period helpers (puros) ────────────────────────────────────────────

export function periodOverlapsRange(
  period: string,
  fromISO: string,
  toISO: string,
): boolean {
  if (!PERIOD_REGEX.test(period)) return false;
  const year = deriveFiscalYear(period);
  let pFrom: string;
  let pTo: string;
  if (period.startsWith('Q')) {
    const q = Number.parseInt(period[1]!, 10);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const endDay = endMonth === 6 ? 30 : endMonth === 9 ? 30 : endMonth === 3 ? 31 : 31;
    pFrom = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    pTo = `${year}-${String(endMonth).padStart(2, '0')}-${endDay}`;
  } else if (period.startsWith('M')) {
    const m = Number.parseInt(period.slice(1, 3), 10);
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    pFrom = `${year}-${String(m).padStart(2, '0')}-01`;
    pTo = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;
  } else {
    pFrom = `${year}-01-01`;
    pTo = `${year}-12-31`;
  }
  return pFrom <= toISO && pTo >= fromISO;
}
