export type PeriodRange = {
  label: string;
  from: Date;
  to: Date;
};

function endOfMonth(year: number, monthZeroBased: number): Date {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0));
}

export function parsePeriod(period?: string | null): PeriodRange {
  const now = new Date();

  if (!period) {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = endOfMonth(now.getUTCFullYear(), now.getUTCMonth());
    return { label: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`, from, to };
  }

  const trimmed = period.trim();
  const qMatch = /^([0-9]{4})-Q([1-4])$/i.exec(trimmed);
  if (qMatch) {
    const year = Number(qMatch[1]);
    const quarter = Number(qMatch[2]);
    const monthStart = (quarter - 1) * 3;
    const from = new Date(Date.UTC(year, monthStart, 1));
    const to = endOfMonth(year, monthStart + 2);
    return { label: `${year}-Q${quarter}`, from, to };
  }

  const mMatch = /^([0-9]{4})-([0-9]{2})$/i.exec(trimmed);
  if (mMatch) {
    const year = Number(mMatch[1]);
    const month = Number(mMatch[2]);
    if (month < 1 || month > 12) {
      throw new Error('Mes inválido, usa YYYY-MM');
    }
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = endOfMonth(year, month - 1);
    return { label: `${year}-${String(month).padStart(2, '0')}`, from, to };
  }

  throw new Error('Formato de periodo inválido. Usa YYYY-Qn o YYYY-MM');
}

export function parseFromTo(from?: string | null, to?: string | null): PeriodRange {
  if (!from || !to) {
    return parsePeriod(null);
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('Rango de fechas inválido');
  }
  return {
    label: `${from}..${to}`,
    from: fromDate,
    to: toDate,
  };
}
