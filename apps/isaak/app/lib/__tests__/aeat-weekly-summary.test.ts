import { buildWeeklySummaryPrompt } from '../aeat-weekly-summary-prompt';

describe('buildWeeklySummaryPrompt', () => {
  const baseNotif = {
    title: 'Comunicación informativa IVA',
    emisor: 'AEAT',
    tipo: 'comunicacion',
    notificationDate: new Date('2026-05-20T10:00:00Z'),
    severity: 'normal' as const,
  };

  it('includes tenant name and window in the opening line', () => {
    const out = buildWeeklySummaryPrompt({
      tenantName: 'Acme SL',
      windowDays: 7,
      notifications: [baseNotif],
      censusChanges: [],
    });
    expect(out).toContain('Acme SL');
    expect(out).toContain('7 días');
  });

  it('lists notifications with severity tag uppercased', () => {
    const out = buildWeeklySummaryPrompt({
      tenantName: 'Acme',
      windowDays: 7,
      notifications: [
        { ...baseNotif, severity: 'critical' as const, title: 'Requerimiento IVA' },
      ],
      censusChanges: [],
    });
    expect(out).toContain('[CRITICAL]');
    expect(out).toContain('Requerimiento IVA');
  });

  it('lists census changes with appropriate verb', () => {
    const out = buildWeeklySummaryPrompt({
      tenantName: 'Acme',
      windowDays: 7,
      notifications: [],
      censusChanges: [
        {
          field: 'domicilioFiscal',
          changeType: 'modified',
          oldValue: 'C/ Mayor 1',
          newValue: 'C/ Real 5',
        },
        { field: 'iaeEpigrafe', changeType: 'added', oldValue: null, newValue: '843.9' },
        { field: 'fechaBaja', changeType: 'removed', oldValue: '2026-04-01', newValue: null },
      ],
    });
    expect(out).toMatch(/"C\/ Mayor 1" → "C\/ Real 5"/);
    expect(out).toMatch(/añadido "843\.9"/);
    expect(out).toMatch(/eliminado "2026-04-01"/);
  });

  it('mentions "ninguna nueva" when there are no notifications', () => {
    const out = buildWeeklySummaryPrompt({
      tenantName: 'Acme',
      windowDays: 7,
      notifications: [],
      censusChanges: [
        { field: 'iae', changeType: 'added', oldValue: null, newValue: '843.9' },
      ],
    });
    expect(out).toMatch(/ninguna nueva/);
  });

  it('caps response with the instruction about no header', () => {
    const out = buildWeeklySummaryPrompt({
      tenantName: 'Acme',
      windowDays: 7,
      notifications: [baseNotif],
      censusChanges: [],
    });
    expect(out).toMatch(/solo el texto del resumen/);
  });

  it('includes the rules block with severity-first ordering instruction', () => {
    const out = buildWeeklySummaryPrompt({
      tenantName: 'Acme',
      windowDays: 30,
      notifications: [baseNotif],
      censusChanges: [],
    });
    expect(out).toMatch(/REGLAS/);
    expect(out).toMatch(/críticas primero/i);
    expect(out).toMatch(/30 días/);
  });
});
