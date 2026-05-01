import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';
import { ResourceNotFoundError, ValidationError } from '../api/errors';
import { createConfirmationToken, consumeConfirmationToken } from '../actions/confirmationTokens';
import { ConfirmationRequiredError } from '../api/errors';

export type ActionStatus = 'pending' | 'approved' | 'executed' | 'cancelled' | 'expired';

export type ActionRecord = {
  id: string;
  tenantId: string;
  type: string;
  status: ActionStatus;
  payload: Record<string, unknown>;
  reason: string | null;
  riskLevel: string;
  proposedBy: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProposeActionInput = {
  type: string;
  payload: Record<string, unknown>;
  reason?: string;
  expiresInSeconds?: number;
};

const ACTION_RISK: Record<string, string> = {
  issue_invoice: 'high',
  send_reminder: 'low',
  update_customer: 'medium',
};

export async function proposeAction(
  ctx: IsaakExecutionContext,
  input: ProposeActionInput
): Promise<ActionRecord> {
  const expiresInMs = (input.expiresInSeconds ?? 3600) * 1000;
  const expiresAt = new Date(Date.now() + expiresInMs);
  const riskLevel = ACTION_RISK[input.type] ?? 'medium';

  const action = await prisma.isaakProposedAction.create({
    data: {
      tenantId: ctx.tenantId,
      proposedBy: ctx.userId,
      type: input.type,
      status: 'pending',
      payload: input.payload,
      reason: input.reason ?? null,
      riskLevel,
      expiresAt,
    },
  });

  return action as ActionRecord;
}

export async function listActions(
  ctx: IsaakExecutionContext,
  opts: { status?: string; page?: number; limit?: number } = {}
): Promise<{ items: ActionRecord[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, opts.limit ?? 50);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (opts.status) where.status = opts.status;

  const [items, total] = await Promise.all([
    prisma.isaakProposedAction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.isaakProposedAction.count({ where }),
  ]);

  return { items: items as ActionRecord[], total, page, limit };
}

export async function getAction(
  ctx: IsaakExecutionContext,
  actionId: string
): Promise<ActionRecord> {
  const action = await prisma.isaakProposedAction.findFirst({
    where: { id: actionId, tenantId: ctx.tenantId },
  });
  if (!action) throw new ResourceNotFoundError('Acción', actionId);
  return action as ActionRecord;
}

export async function requestActionApproval(
  ctx: IsaakExecutionContext,
  actionId: string
): Promise<{ confirmationToken: string; expiresAt: Date; preview: Record<string, unknown> }> {
  const action = await getAction(ctx, actionId);
  if (action.status !== 'pending') {
    throw new ValidationError(`La acción está en estado '${action.status}' y no puede aprobarse.`);
  }

  const { token, expiresAt } = createConfirmationToken({
    tenantId: ctx.tenantId,
    action: `approve_action`,
    resourceId: actionId,
    preview: { type: action.type, payload: action.payload, riskLevel: action.riskLevel },
  });

  return {
    confirmationToken: token,
    expiresAt,
    preview: { type: action.type, payload: action.payload },
  };
}

export async function approveAction(
  ctx: IsaakExecutionContext,
  actionId: string,
  confirmationToken: string
): Promise<ActionRecord> {
  consumeConfirmationToken({
    token: confirmationToken,
    tenantId: ctx.tenantId,
    action: 'approve_action',
    resourceId: actionId,
  });

  const updated = await prisma.isaakProposedAction.update({
    where: { id: actionId },
    data: { status: 'approved' },
  });
  return updated as ActionRecord;
}

export async function cancelAction(
  ctx: IsaakExecutionContext,
  actionId: string
): Promise<ActionRecord> {
  const action = await getAction(ctx, actionId);
  if (!['pending', 'approved'].includes(action.status)) {
    throw new ValidationError(`La acción en estado '${action.status}' no puede cancelarse.`);
  }
  const updated = await prisma.isaakProposedAction.update({
    where: { id: actionId },
    data: { status: 'cancelled' },
  });
  return updated as ActionRecord;
}
