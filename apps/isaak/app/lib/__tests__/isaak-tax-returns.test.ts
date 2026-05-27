// Pure tests for the tax-returns service. Mock prisma so we cover
// validation + period-overlap helpers without spinning up a DB.

jest.mock('../prisma', () => ({
  prisma: {
    isaakTaxReturn: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { prisma } from '../prisma';
import {
  TAX_RETURN_MODELS,
  TAX_RETURN_STATUSES,
  deriveFiscalYear,
  periodOverlapsRange,
  upsertTaxReturn,
  validateTaxReturnInput,
} from '../isaak-tax-returns';

const TENANT = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('catalog constants', () => {
  it('exposes 14 supported models', () => {
    expect(TAX_RETURN_MODELS).toContain('303');
    expect(TAX_RETURN_MODELS).toContain('130');
    expect(TAX_RETURN_MODELS).toContain('190');
    expect(TAX_RETURN_MODELS).toContain('714');
    expect(TAX_RETURN_MODELS.length).toBe(14);
  });

  it('exposes 5 statuses', () => {
    expect(TAX_RETURN_STATUSES).toEqual([
      'draft',
      'presented',
      'accepted',
      'rejected',
      'rectified',
    ]);
  });
});

describe('deriveFiscalYear', () => {
  it('extracts year from quarterly periods', () => {
    expect(deriveFiscalYear('Q1-2026')).toBe(2026);
    expect(deriveFiscalYear('Q4-2024')).toBe(2024);
  });

  it('extracts year from monthly periods', () => {
    expect(deriveFiscalYear('M03-2026')).toBe(2026);
  });

  it('extracts year from annual periods', () => {
    expect(deriveFiscalYear('A-2025')).toBe(2025);
  });

  it('throws on malformed period', () => {
    expect(() => deriveFiscalYear('foo')).toThrow();
  });
});

describe('validateTaxReturnInput', () => {
  function baseInput(overrides: Record<string, unknown> = {}) {
    return {
      tenantId: TENANT,
      model: '303' as const,
      period: 'Q2-2026',
      amountDeclared: '1500.00',
      createdBy: 'user-1',
      ...overrides,
    };
  }

  it('normalizes a valid input', () => {
    const out = validateTaxReturnInput(baseInput());
    expect(out.fiscalYear).toBe(2026);
    expect(out.status).toBe('draft');
    expect(out.presentedAt).toBeNull();
    expect(out.amountToPay).toBeNull();
  });

  it('sets presentedAt to now when status=presented and no value', () => {
    const out = validateTaxReturnInput(baseInput({ status: 'presented' }));
    expect(out.presentedAt).toBeInstanceOf(Date);
  });

  it('parses dueDate to Date', () => {
    const out = validateTaxReturnInput(baseInput({ dueDate: '2026-07-20' }));
    expect(out.dueDate?.toISOString().slice(0, 10)).toBe('2026-07-20');
  });

  it('rejects invalid UUID', () => {
    expect(() => validateTaxReturnInput(baseInput({ tenantId: 'not-uuid' }))).toThrow(/tenantId/);
  });

  it('rejects unknown model', () => {
    expect(() => validateTaxReturnInput(baseInput({ model: '999' }))).toThrow(/model/);
  });

  it('rejects malformed period', () => {
    expect(() => validateTaxReturnInput(baseInput({ period: 'Q5-2026' }))).toThrow(/period/);
    expect(() => validateTaxReturnInput(baseInput({ period: '2026Q2' }))).toThrow(/period/);
    expect(() => validateTaxReturnInput(baseInput({ period: 'M13-2026' }))).toThrow(/period/);
  });

  it('rejects non-decimal amountDeclared', () => {
    expect(() => validateTaxReturnInput(baseInput({ amountDeclared: 'foo' }))).toThrow(/amountDeclared/);
  });

  it('rejects unknown status', () => {
    expect(() => validateTaxReturnInput(baseInput({ status: 'wrong' }))).toThrow(/status/);
  });

  it('requires createdBy', () => {
    expect(() => validateTaxReturnInput(baseInput({ createdBy: '  ' }))).toThrow(/createdBy/);
  });
});

describe('periodOverlapsRange', () => {
  it('returns true when period is fully inside the audit range', () => {
    expect(periodOverlapsRange('Q1-2026', '2026-01-01', '2026-12-31')).toBe(true);
    expect(periodOverlapsRange('M03-2026', '2026-03-01', '2026-03-31')).toBe(true);
    expect(periodOverlapsRange('A-2025', '2025-01-01', '2025-12-31')).toBe(true);
  });

  it('returns true when period partially overlaps', () => {
    expect(periodOverlapsRange('Q1-2026', '2026-03-15', '2026-04-15')).toBe(true);
  });

  it('returns false when period is entirely outside the range', () => {
    expect(periodOverlapsRange('Q1-2026', '2026-04-01', '2026-06-30')).toBe(false);
    expect(periodOverlapsRange('A-2024', '2025-01-01', '2025-12-31')).toBe(false);
  });

  it('returns false for malformed periods (safe default)', () => {
    expect(periodOverlapsRange('foo', '2026-01-01', '2026-12-31')).toBe(false);
  });
});

describe('upsertTaxReturn (with mocked prisma)', () => {
  it('creates a new row when none exists', async () => {
    (prisma.isaakTaxReturn.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.isaakTaxReturn.create as jest.Mock).mockResolvedValueOnce({ id: 'new-id' });

    const r = await upsertTaxReturn({
      tenantId: TENANT,
      model: '303',
      period: 'Q2-2026',
      amountDeclared: '500.00',
      createdBy: 'user-1',
    });
    expect(r.id).toBe('new-id');
    expect(r.isNew).toBe(true);
    expect(prisma.isaakTaxReturn.create).toHaveBeenCalledTimes(1);
    expect(prisma.isaakTaxReturn.update).not.toHaveBeenCalled();
    // Importante: el filtro por unique compuesto incluye tenantId
    const updateArgs = (prisma.isaakTaxReturn.findUnique as jest.Mock).mock.calls[0][0];
    expect(updateArgs.where.tenantId_model_period.tenantId).toBe(TENANT);
  });

  it('updates when an entry already exists', async () => {
    (prisma.isaakTaxReturn.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existing-id' });
    (prisma.isaakTaxReturn.update as jest.Mock).mockResolvedValueOnce({ id: 'existing-id' });

    const r = await upsertTaxReturn({
      tenantId: TENANT,
      model: '303',
      period: 'Q2-2026',
      status: 'presented',
      amountDeclared: '600.00',
      createdBy: 'user-1',
    });
    expect(r.id).toBe('existing-id');
    expect(r.isNew).toBe(false);
    expect(prisma.isaakTaxReturn.create).not.toHaveBeenCalled();
    expect(prisma.isaakTaxReturn.update).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid input before touching prisma', async () => {
    await expect(
      upsertTaxReturn({
        tenantId: TENANT,
        model: '303',
        period: 'bad',
        amountDeclared: '100',
        createdBy: 'u',
      }),
    ).rejects.toThrow(/period/);
    expect(prisma.isaakTaxReturn.findUnique).not.toHaveBeenCalled();
  });
});
