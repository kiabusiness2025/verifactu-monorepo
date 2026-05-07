import { scoreReconciliation } from './reconcileScore';

describe('scoreReconciliation', () => {
  it('returns high score for clear match', () => {
    const result = scoreReconciliation({
      movementAmount: 120,
      movementDate: new Date('2026-05-01T00:00:00.000Z'),
      movementText: 'Factura proveedor oficina abril',
      candidateAmount: 120,
      candidateDate: new Date('2026-05-02T00:00:00.000Z'),
      candidateText: 'Factura proveedor oficina abril',
      amountToleranceEur: 1,
      dateWindowDays: 3,
    });

    expect(result.score).toBeGreaterThanOrEqual(0.85);
    expect(result.reasons).toContain('Importe dentro de tolerancia');
    expect(result.reasons).toContain('Fecha dentro de ventana');
  });

  it('returns medium score when amount/date are close but text is partial', () => {
    const result = scoreReconciliation({
      movementAmount: 99.5,
      movementDate: new Date('2026-05-05T00:00:00.000Z'),
      movementText: 'Suscripcion software equipo',
      candidateAmount: 100,
      candidateDate: new Date('2026-05-08T00:00:00.000Z'),
      candidateText: 'Pago software anual',
      amountToleranceEur: 1,
      dateWindowDays: 3,
    });

    expect(result.score).toBeGreaterThan(0.4);
    expect(result.score).toBeLessThan(0.9);
    expect(result.details.amountDelta).toBeCloseTo(0.5);
  });

  it('returns low score when candidate is out of tolerance and window', () => {
    const result = scoreReconciliation({
      movementAmount: 200,
      movementDate: new Date('2026-05-01T00:00:00.000Z'),
      movementText: 'Transferencia alquiler',
      candidateAmount: 260,
      candidateDate: new Date('2026-05-20T00:00:00.000Z'),
      candidateText: 'Compra material oficina',
      amountToleranceEur: 1,
      dateWindowDays: 3,
    });

    expect(result.score).toBeLessThan(0.2);
    expect(result.reasons).not.toContain('Importe dentro de tolerancia');
    expect(result.reasons).not.toContain('Fecha dentro de ventana');
  });
});
