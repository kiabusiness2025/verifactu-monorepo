// C-B1.b — Servicio de presentaciones AEAT.
//
// Crea un IsaakAeatSubmission (audit-log inmutable) cuando el usuario
// confirma un borrador. La parte pura (canonicalización + hash) se
// testea sin Prisma; el wrapper que toca DB orquesta:
//
//   1. Valida que el IsaakTaxReturn existe y está en status 'draft'
//      o 'rejected' (rectificativa)
//   2. Calcula payloadHash sobre el payload canónico
//   3. Crea IsaakAeatSubmission con status='pending_aeat'
//   4. Promueve el IsaakTaxReturn de 'draft' a 'presented'
//
// El envío SOAP real a AEAT vive en C-B1.c.

import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// ─── Helpers puros (testeables) ────────────────────────────────────────

export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`,
  );
  return `{${parts.join(',')}}`;
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

export type SubmissionStatus =
  | 'pending_aeat'
  | 'submitting' // worker procesándola activamente (lock real)
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'error'
  | 'cancelled';

export type CreateSubmissionInput = {
  tenantId: string;
  model: string; // '303', '130', '111', etc.
  period: string; // 'Q2-2026', 'M03-2026', 'A-2025'
  taxReturnId?: string | null;
  payload: Record<string, unknown>;
  submittedBy: string; // userId
  certFingerprint?: string | null;
};

export type CreateSubmissionResult =
  | {
      ok: true;
      submissionId: string;
      taxReturnUpdated: boolean;
      payloadHash: string;
    }
  | {
      ok: false;
      error:
        | 'invalid_input'
        | 'tax_return_not_found'
        | 'tax_return_not_in_draft'
        | 'duplicate_submission'
        | 'create_failed';
      message: string;
    };

const UUID_REGEX = /^[0-9a-f-]{36}$/i;
const HASH_HEX_REGEX = /^[0-9a-f]{64}$/;

export async function createSubmission(
  input: CreateSubmissionInput,
): Promise<CreateSubmissionResult> {
  if (!UUID_REGEX.test(input.tenantId)) {
    return { ok: false, error: 'invalid_input', message: 'tenantId must be UUID' };
  }
  if (!input.model || !input.period) {
    return { ok: false, error: 'invalid_input', message: 'model and period are required' };
  }
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy is required' };
  }
  if (input.certFingerprint && !HASH_HEX_REGEX.test(input.certFingerprint)) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'certFingerprint must be 64-char hex (SHA-256)',
    };
  }

  const payloadHash = hashPayload(input.payload);

  // Si nos pasaron taxReturnId, validamos su estado actual. Solo se
  // puede presentar un borrador (draft) o un rechazado (rectificativa).
  if (input.taxReturnId) {
    if (!UUID_REGEX.test(input.taxReturnId)) {
      return { ok: false, error: 'invalid_input', message: 'taxReturnId must be UUID' };
    }
    const tr = await prisma.isaakTaxReturn.findFirst({
      where: { id: input.taxReturnId, tenantId: input.tenantId },
      select: { id: true, status: true, model: true, period: true },
    });
    if (!tr) {
      return { ok: false, error: 'tax_return_not_found', message: 'IsaakTaxReturn not found for this tenant' };
    }
    if (tr.status !== 'draft' && tr.status !== 'rejected') {
      return {
        ok: false,
        error: 'tax_return_not_in_draft',
        message: `IsaakTaxReturn status="${tr.status}" — solo se pueden presentar borradores (draft) o rectificar rechazadas (rejected).`,
      };
    }
    if (tr.model !== input.model || tr.period !== input.period) {
      return {
        ok: false,
        error: 'invalid_input',
        message: `IsaakTaxReturn (${tr.model}/${tr.period}) no coincide con submission (${input.model}/${input.period}).`,
      };
    }
  }

  // Dedupe defensiva: si ya hay una submission del mismo payloadHash
  // en estado pending_aeat/submitting/submitted/accepted, no creamos otra.
  // ('submitting' añadido en C-B1.c fix R4: worker procesándola)
  const existing = await prisma.isaakAeatSubmission.findFirst({
    where: {
      tenantId: input.tenantId,
      model: input.model,
      period: input.period,
      payloadHash,
      status: { in: ['pending_aeat', 'submitting', 'submitted', 'accepted'] },
    },
    select: { id: true, status: true },
  });
  if (existing) {
    return {
      ok: false,
      error: 'duplicate_submission',
      message: `Ya existe una submission con el mismo payload (status="${existing.status}", id=${existing.id.slice(0, 8)}).`,
    };
  }

  try {
    // Transacción: crear submission + actualizar tax return en 1 paso.
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.isaakAeatSubmission.create({
        data: {
          tenantId: input.tenantId,
          model: input.model,
          period: input.period,
          taxReturnId: input.taxReturnId ?? null,
          status: 'pending_aeat',
          payload: input.payload as Prisma.InputJsonValue,
          payloadHash,
          certFingerprint: input.certFingerprint ?? null,
          submittedBy: input.submittedBy.trim(),
        },
        select: { id: true },
      });

      let taxReturnUpdated = false;
      if (input.taxReturnId) {
        await tx.isaakTaxReturn.update({
          where: { id: input.taxReturnId },
          data: { status: 'presented', presentedAt: new Date() },
        });
        taxReturnUpdated = true;
      }

      return { submissionId: created.id, taxReturnUpdated };
    });
    return { ok: true, ...result, payloadHash };
  } catch (err) {
    return {
      ok: false,
      error: 'create_failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── List + get (UI + admin) ─────────────────────────────────────────

export type SubmissionRow = {
  id: string;
  model: string;
  period: string;
  status: SubmissionStatus;
  taxReturnId: string | null;
  payloadHash: string;
  certFingerprint: string | null;
  aeatReference: string | null;
  errorMessage: string | null;
  submittedBy: string;
  submittedAt: string;
  ackedAt: string | null;
};

export async function listSubmissions(input: {
  tenantId: string;
  model?: string;
  period?: string;
  status?: SubmissionStatus;
  limit?: number;
}): Promise<SubmissionRow[]> {
  const where: {
    tenantId: string;
    model?: string;
    period?: string;
    status?: SubmissionStatus;
  } = { tenantId: input.tenantId };
  if (input.model) where.model = input.model;
  if (input.period) where.period = input.period;
  if (input.status) where.status = input.status;

  const rows = await prisma.isaakAeatSubmission.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: Math.max(1, Math.min(100, input.limit ?? 20)),
    select: {
      id: true,
      model: true,
      period: true,
      status: true,
      taxReturnId: true,
      payloadHash: true,
      certFingerprint: true,
      aeatReference: true,
      errorMessage: true,
      submittedBy: true,
      submittedAt: true,
      ackedAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    model: r.model,
    period: r.period,
    status: r.status as SubmissionStatus,
    taxReturnId: r.taxReturnId,
    payloadHash: r.payloadHash,
    certFingerprint: r.certFingerprint,
    aeatReference: r.aeatReference,
    errorMessage: r.errorMessage,
    submittedBy: r.submittedBy,
    submittedAt: r.submittedAt.toISOString(),
    ackedAt: r.ackedAt ? r.ackedAt.toISOString() : null,
  }));
}
