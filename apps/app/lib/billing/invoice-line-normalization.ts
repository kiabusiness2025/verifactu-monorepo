import { z } from 'zod';

const AMOUNT_TOLERANCE_CENTS = 1;

export const toCents = (value: number): number => Math.round(value * 100);
export const fromCents = (value: number): number => value / 100;

export const lineItemSchema = z
  .object({
    articleId: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    taxRate: z.number().min(0).max(1),
    discount: z.number().min(0).max(100).optional().default(0),
    netAmount: z.number().nonnegative().optional(),
    vatAmount: z.number().nonnegative().optional(),
    totalAmount: z.number().nonnegative().optional(),
  })
  .superRefine((line, ctx) => {
    const expected = calculateLineAmounts(line);

    const checks: Array<['netAmount' | 'vatAmount' | 'totalAmount', number | undefined, number]> = [
      ['netAmount', line.netAmount, expected.netAmount],
      ['vatAmount', line.vatAmount, expected.vatAmount],
      ['totalAmount', line.totalAmount, expected.totalAmount],
    ];

    for (const [field, provided, computed] of checks) {
      if (provided === undefined) continue;
      const diff = Math.abs(toCents(provided) - toCents(computed));
      if (diff > AMOUNT_TOLERANCE_CENTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} inconsistent with quantity/unitPrice/taxRate/discount`,
        });
      }
    }
  });

export type InvoiceLineInput = z.infer<typeof lineItemSchema>;

export type NormalizedInvoiceLine = InvoiceLineInput & {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export function calculateLineAmounts(line: Pick<InvoiceLineInput, 'quantity' | 'unitPrice' | 'taxRate' | 'discount'>) {
  const discount = line.discount ?? 0;
  const grossCents = toCents(line.quantity * line.unitPrice);
  const discountCents = toCents((grossCents * discount) / 100);
  const netCents = grossCents - discountCents;
  const vatCents = toCents(fromCents(netCents) * line.taxRate);
  const totalCents = netCents + vatCents;

  return {
    netAmount: fromCents(netCents),
    vatAmount: fromCents(vatCents),
    totalAmount: fromCents(totalCents),
  };
}

export function normalizeLine(line: InvoiceLineInput): NormalizedInvoiceLine {
  const amounts = calculateLineAmounts(line);
  return {
    ...line,
    netAmount: amounts.netAmount,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
  };
}
