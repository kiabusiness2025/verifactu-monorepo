import { lineItemSchema, normalizeLine } from './invoice-line-normalization';

describe('invoice line normalization', () => {
  it('calculates net/vat/total when amounts are not provided', () => {
    const line = lineItemSchema.parse({
      articleId: 'art_1',
      quantity: 2,
      unitPrice: 50,
      taxRate: 0.21,
    });
    const normalized = normalizeLine(line);

    expect(normalized.netAmount).toBe(100);
    expect(normalized.vatAmount).toBe(21);
    expect(normalized.totalAmount).toBe(121);
  });

  it('accepts line with consistent provided amounts', () => {
    const parsed = lineItemSchema.safeParse({
      articleId: 'art_2',
      quantity: 1,
      unitPrice: 100,
      taxRate: 0.21,
      netAmount: 100,
      vatAmount: 21,
      totalAmount: 121,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects line with inconsistent provided amounts', () => {
    const parsed = lineItemSchema.safeParse({
      articleId: 'art_3',
      quantity: 1,
      unitPrice: 100,
      taxRate: 0.21,
      netAmount: 100,
      vatAmount: 10,
      totalAmount: 110,
    });

    expect(parsed.success).toBe(false);
  });
});
