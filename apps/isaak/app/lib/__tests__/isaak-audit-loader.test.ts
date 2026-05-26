// Tests for the audit loader. Mocks prisma raw queries with jest so we
// can assert tenant_id-first invariants and rowsemantics without a DB.

jest.mock('../prisma', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
  },
}));

import { prisma } from '../prisma';
import {
  buildAuditSnapshotForTenant,
  loadBankAccountSummaries,
  loadLedgerRowsForPeriod,
  loadTaxReturnsForPeriod,
} from '../isaak-audit-loader';

const TENANT = '11111111-1111-1111-1111-111111111111';

const mockedQueryRaw = prisma.$queryRawUnsafe as unknown as jest.Mock;

beforeEach(() => {
  mockedQueryRaw.mockReset();
});

describe('loadLedgerRowsForPeriod', () => {
  it('queries with tenant_id as first parameter and date range', async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        docType: 'invoice_out',
        amount: '1210.00',
        taxBase: '1000.00',
        vatAmount: '210.00',
        description: 'Venta',
        counterpartyNif: 'B1',
        entryDate: new Date('2026-05-15T00:00:00Z'),
      },
    ]);
    const rows = await loadLedgerRowsForPeriod(TENANT, '2026-05-01', '2026-05-31');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.docType).toBe('invoice_out');
    expect(rows[0]?.amount).toBe('1210.00');
    expect(rows[0]?.entryDate).toBe('2026-05-15');

    const call = mockedQueryRaw.mock.calls[0]!;
    const sql = call[0] as string;
    expect(sql).toMatch(/FROM isaak_ledger_entries/);
    expect(sql).toMatch(/WHERE tenant_id = \$1::uuid/);
    expect(call[1]).toBe(TENANT);
    expect(call[2]).toBe('2026-05-01');
    expect(call[3]).toBe('2026-05-31');
  });

  it('coerces null tax_base / vat_amount to null', async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        docType: 'expense',
        amount: '100.00',
        taxBase: null,
        vatAmount: null,
        description: 'x',
        counterpartyNif: null,
        entryDate: new Date('2026-05-01T00:00:00Z'),
      },
    ]);
    const rows = await loadLedgerRowsForPeriod(TENANT, '2026-05-01', '2026-05-31');
    expect(rows[0]?.taxBase).toBeNull();
    expect(rows[0]?.vatAmount).toBeNull();
  });
});

describe('loadTaxReturnsForPeriod', () => {
  it('returns empty when no presented returns exist for the tenant', async () => {
    mockedQueryRaw.mockResolvedValueOnce([]);
    const out = await loadTaxReturnsForPeriod(TENANT, '2026-05-01', '2026-05-31');
    expect(out).toEqual([]);
    const sql = mockedQueryRaw.mock.calls[0]![0] as string;
    expect(sql).toMatch(/FROM isaak_tax_returns/);
    expect(sql).toMatch(/WHERE tenant_id = \$1::uuid/);
    expect(sql).toMatch(/status IN \('presented', 'accepted'\)/);
  });

  it('filters returns that do not overlap the audited range', async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        model: '303',
        period: 'Q1-2026',
        amountDeclared: '500.00',
        presentedAt: new Date('2026-04-15T00:00:00Z'),
      },
      {
        model: '303',
        period: 'Q2-2026',
        amountDeclared: '700.00',
        presentedAt: new Date('2026-07-15T00:00:00Z'),
      },
    ]);
    const out = await loadTaxReturnsForPeriod(TENANT, '2026-04-01', '2026-06-30');
    // Only Q2-2026 overlaps; Q1-2026 is before the range.
    expect(out).toHaveLength(1);
    expect(out[0]?.model).toBe('303');
    expect(out[0]?.period).toBe('Q2-2026');
  });
});

describe('loadBankAccountSummaries', () => {
  it('filters by tenant_id and maps balance + last reconciliation date', async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'BBVA Cuenta principal',
        iban: 'ES1112341234123412341234',
        balance: '1500.75',
        lastReconciliationDate: new Date('2026-05-20T00:00:00Z'),
      },
      {
        id: 'acc-2',
        name: 'Santander',
        iban: null,
        balance: '0.00',
        lastReconciliationDate: null,
      },
    ]);
    const out = await loadBankAccountSummaries(TENANT);
    expect(out).toHaveLength(2);
    expect(out[0]?.account).toBe('ES1112341234123412341234');
    expect(out[0]?.lastReconciliationDate).toBe('2026-05-20');
    expect(out[1]?.account).toBe('Santander');
    expect(out[1]?.lastReconciliationDate).toBeNull();

    const sql = mockedQueryRaw.mock.calls[0]![0] as string;
    expect(sql).toMatch(/FROM se_accounts a/);
    expect(sql).toMatch(/WHERE a\.tenant_id = \$1::uuid/);
  });
});

describe('buildAuditSnapshotForTenant', () => {
  it('rejects invalid period dates', async () => {
    await expect(
      buildAuditSnapshotForTenant({ tenantId: TENANT, periodFrom: '2026/05/01', periodTo: '2026-05-31' }),
    ).rejects.toThrow(/periodFrom/);
    await expect(
      buildAuditSnapshotForTenant({ tenantId: TENANT, periodFrom: '2026-05-01', periodTo: '2026/05/31' }),
    ).rejects.toThrow(/periodTo/);
  });

  it('requires tenantId', async () => {
    await expect(
      buildAuditSnapshotForTenant({ tenantId: '', periodFrom: '2026-05-01', periodTo: '2026-05-31' }),
    ).rejects.toThrow(/tenantId/);
  });

  it('runs all four loaders in parallel and aggregates into snapshot', async () => {
    // Four queries expected: ledger rows, tax returns, bank accounts,
    // account balances (L4-L5). Order matches Promise.all in
    // buildAuditSnapshotForTenant.
    mockedQueryRaw
      .mockResolvedValueOnce([
        // ledger row: factura emitida
        {
          docType: 'invoice_out',
          amount: '1210.00',
          taxBase: '1000.00',
          vatAmount: '210.00',
          description: 'Venta',
          counterpartyNif: 'B1',
          entryDate: new Date('2026-05-15T00:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        // bank account
        {
          id: 'acc-1',
          name: 'BBVA',
          iban: 'ES1212341234123412341234',
          balance: '500.00',
          lastReconciliationDate: null,
        },
      ])
      .mockResolvedValueOnce([
        // account balances: caja con 500€ + cuenta 555 con 250€
        { account: '570', balance: '500.00', totalDebits: '500.00', totalCredits: '0.00' },
        { account: '555', balance: '250.00', totalDebits: '250.00', totalCredits: '0.00' },
      ]);

    const snap = await buildAuditSnapshotForTenant({
      tenantId: TENANT,
      periodFrom: '2026-05-01',
      periodTo: '2026-05-31',
    });
    expect(snap.vatRepercutidoTotal).toBe('210.00');
    expect(snap.bankAccounts).toHaveLength(1);
    expect(snap.periodFrom).toBe('2026-05-01');
    expect(snap.periodTo).toBe('2026-05-31');
    // L4-L5: cashBalance ahora viene del agregado real
    expect(snap.cashBalance).toBe('500.00');
    expect(snap.pendingAccountsBalance).toBe('250.00');
    expect(snap.presentedModels).toEqual([]);
  });
});
