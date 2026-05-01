import { z } from 'zod';

export const ProposeActionSchema = z.object({
  type: z.enum(['issue_invoice', 'send_reminder', 'update_customer']),
  payload: z.record(z.unknown()),
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
  status: z.enum(['pending', 'approved', 'executed', 'cancelled', 'expired']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type ProposeActionInput = z.infer<typeof ProposeActionSchema>;
export type ListActionsQuery = z.infer<typeof ListActionsQuerySchema>;
