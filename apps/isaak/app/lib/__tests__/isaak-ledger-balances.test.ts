import {
  aggregateBalancesForAudit,
  buildAccountBalancesSQL,
  classifyAccount,
  classifyBalances,
  isBankAccount,
  isCashAccount,
  isPartnerAccount,
  isPendingAccount,
  type AccountBalance,
} from '../isaak-ledger-balances';

describe('classifyAccount + helpers PGC', () => {
  it('reconoce caja (570/571)', () => {
    expect(isCashAccount('570')).toBe(true);
    expect(isCashAccount('5700')).toBe(true); // subcuenta
    expect(isCashAccount('571')).toBe(true);
    expect(isCashAccount('572')).toBe(false);
    expect(classifyAccount('570')).toBe('cash');
  });

  it('reconoce bancos (572/573/574)', () => {
    expect(isBankAccount('572')).toBe(true);
    expect(isBankAccount('57200001')).toBe(true);
    expect(isBankAccount('573')).toBe(true);
    expect(isBankAccount('574')).toBe(true);
    expect(isBankAccount('570')).toBe(false);
    expect(classifyAccount('572')).toBe('bank');
  });

  it('reconoce socios (551/552)', () => {
    expect(isPartnerAccount('551')).toBe(true);
    expect(isPartnerAccount('5510001')).toBe(true);
    expect(isPartnerAccount('552')).toBe(true);
    expect(isPartnerAccount('550')).toBe(false);
    expect(classifyAccount('551')).toBe('partner');
  });

  it('reconoce partidas pendientes (555)', () => {
    expect(isPendingAccount('555')).toBe(true);
    expect(isPendingAccount('5550')).toBe(true);
    expect(isPendingAccount('556')).toBe(false);
    expect(classifyAccount('555')).toBe('pending');
  });

  it('clasifica otras cuentas como "other"', () => {
    expect(classifyAccount('430')).toBe('other'); // Clientes
    expect(classifyAccount('700')).toBe('other'); // Ventas
    expect(classifyAccount('600')).toBe('other'); // Compras
    expect(classifyAccount('410')).toBe('other'); // Proveedores
  });
});

describe('buildAccountBalancesSQL', () => {
  it('filtra por tenant_id como primer parámetro siempre', () => {
    const sql = buildAccountBalancesSQL({ applyEnd: false });
    expect(sql).toMatch(/WHERE tenant_id = \$1::uuid/);
    // Y la segunda referencia (en el UNION ALL) también:
    const matches = sql.match(/tenant_id = \$1::uuid/g);
    expect(matches).toHaveLength(2);
  });

  it('añade filtro de periodEnd cuando applyEnd=true', () => {
    const sql = buildAccountBalancesSQL({ applyEnd: true });
    expect(sql).toMatch(/entry_date <= \$2::date/);
    const matches = sql.match(/entry_date <= \$2::date/g);
    expect(matches).toHaveLength(2);
  });

  it('NO añade filtro de periodEnd cuando applyEnd=false', () => {
    const sql = buildAccountBalancesSQL({ applyEnd: false });
    expect(sql).not.toMatch(/entry_date <=/);
  });

  it('agrupa por account y devuelve balance + totalDebits + totalCredits', () => {
    const sql = buildAccountBalancesSQL({ applyEnd: false });
    expect(sql).toMatch(/GROUP BY account/);
    expect(sql).toMatch(/SUM\(signed_amount\)::text AS "balance"/);
    expect(sql).toMatch(/SUM\(debit_amount\)::text\s+AS "totalDebits"/);
    expect(sql).toMatch(/SUM\(credit_amount\)::text AS "totalCredits"/);
  });

  it('union All para incluir tanto account_debit como account_credit', () => {
    const sql = buildAccountBalancesSQL({ applyEnd: false });
    expect(sql).toMatch(/UNION ALL/);
    expect(sql).toMatch(/account_debit  AS account/);
    expect(sql).toMatch(/account_credit AS account/);
  });
});

describe('classifyBalances', () => {
  it('añade kind a cada row del SQL', () => {
    const raw = [
      { account: '570', balance: '500.00', totalDebits: '1500.00', totalCredits: '1000.00' },
      { account: '430', balance: '-200.00', totalDebits: '0', totalCredits: '200.00' },
      { account: '551', balance: '-1500.00', totalDebits: '500.00', totalCredits: '2000.00' },
    ];
    const out = classifyBalances(raw);
    expect(out[0]?.kind).toBe('cash');
    expect(out[1]?.kind).toBe('other');
    expect(out[2]?.kind).toBe('partner');
  });
});

describe('aggregateBalancesForAudit', () => {
  const base = (
    overrides: Partial<AccountBalance>,
  ): AccountBalance => ({
    account: '570',
    kind: 'cash',
    balance: '0.00',
    totalDebits: '0.00',
    totalCredits: '0.00',
    ...overrides,
  });

  it('suma todas las cuentas cash en cashBalance', () => {
    const balances: AccountBalance[] = [
      base({ account: '570', kind: 'cash', balance: '500.00' }),
      base({ account: '5700001', kind: 'cash', balance: '200.00' }),
      base({ account: '571', kind: 'cash', balance: '-50.00' }),
    ];
    const agg = aggregateBalancesForAudit(balances);
    expect(agg.cashBalance).toBe('650.00');
  });

  it('suma todas las cuentas partner en partnersBalance', () => {
    const balances: AccountBalance[] = [
      base({ account: '551', kind: 'partner', balance: '-500.00' }),
      base({ account: '552', kind: 'partner', balance: '-1000.00' }),
    ];
    const agg = aggregateBalancesForAudit(balances);
    expect(agg.partnersBalance).toBe('-1500.00');
  });

  it('suma cuentas pending', () => {
    const balances: AccountBalance[] = [
      base({ account: '555', kind: 'pending', balance: '250.50' }),
    ];
    expect(aggregateBalancesForAudit(balances).pendingAccountsBalance).toBe('250.50');
  });

  it('suma cuentas bank en pgcBankBalance', () => {
    const balances: AccountBalance[] = [
      base({ account: '572', kind: 'bank', balance: '5000.00' }),
      base({ account: '573', kind: 'bank', balance: '500.00' }),
    ];
    expect(aggregateBalancesForAudit(balances).pgcBankBalance).toBe('5500.00');
  });

  it('devuelve 0.00 cuando no hay saldos del tipo', () => {
    const agg = aggregateBalancesForAudit([]);
    expect(agg.cashBalance).toBe('0.00');
    expect(agg.partnersBalance).toBe('0.00');
    expect(agg.pendingAccountsBalance).toBe('0.00');
    expect(agg.pgcBankBalance).toBe('0.00');
  });

  it('ignora cuentas tipo "other" para los agregados', () => {
    const balances: AccountBalance[] = [
      base({ account: '430', kind: 'other', balance: '999999.00' }),
    ];
    const agg = aggregateBalancesForAudit(balances);
    expect(agg.cashBalance).toBe('0.00');
    expect(agg.partnersBalance).toBe('0.00');
    expect(agg.pendingAccountsBalance).toBe('0.00');
    expect(agg.pgcBankBalance).toBe('0.00');
  });
});
