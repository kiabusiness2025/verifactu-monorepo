import { z } from 'zod';

const ACTION_TYPES = ['issue_invoice', 'send_reminder', 'update_customer'] as const;
const ACTION_STATUSES = ['pending', 'approved', 'executed', 'cancelled', 'expired'] as const;

export const ProposeActionSchema = z.object({
  type: z.union([
    z.literal('issue_invoice'),
    z.literal('send_reminder'),
    z.literal('update_customer'),
  ]),
  payload: z.record(z.string(), z.unknown()),
  reason: z.string().optional(),
  expiresInSeconds: z.number().int().min(60).max(86400).optional().default(3600),
});

export const ApproveActionSchema = z.object({
  confirmationToken: z.string().optional(),
});

export const ExecuteActionSchema = z.object({
  confirmationToken: z.string(),
});

export const ListActionsQuerySchema = z.object({
  status: z
    .union([
      z.literal('pending'),
      z.literal('approved'),
      z.literal('executed'),
      z.literal('cancelled'),
      z.literal('expired'),
    ])
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export { ACTION_TYPES, ACTION_STATUSES };

export type ProposeActionInput = z.infer<typeof ProposeActionSchema>;
export type ListActionsQuery = z.infer<typeof ListActionsQuerySchema>;
