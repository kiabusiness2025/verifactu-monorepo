import { z } from 'zod';

export const InvoiceItemSchema = z.object({
  description: z.string().optional(),
  articleId: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
  discount: z.number().min(0).max(100).optional().default(0),
});

export const CreateInvoiceDraftSchema = z.object({
  customerName: z.string().min(1),
  customerNif: z.string().optional(),
  customerId: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1, 'Se requiere al menos una línea'),
});

export const ListInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  status: z
    .union([
      z.literal('draft'),
      z.literal('validated'),
      z.literal('submitted'),
      z.literal('accepted'),
      z.literal('rejected'),
    ])
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  customer: z.string().optional(),
});

export const IssueInvoiceSchema = z.object({
  confirmationToken: z.string().optional(),
});

export type CreateInvoiceDraftInput = z.infer<typeof CreateInvoiceDraftSchema>;
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>;
export type IssueInvoiceInput = z.infer<typeof IssueInvoiceSchema>;
