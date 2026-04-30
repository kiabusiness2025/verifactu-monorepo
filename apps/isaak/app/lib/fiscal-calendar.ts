export type FiscalDeadline = {
  id: string;
  title: string;
  modelo: string;
  description: string;
  date: Date;
  alertDaysBefore: number;
  category: 'iva' | 'irpf' | 'is' | 'resumen_anual';
};

function deadline(
  year: number,
  month: number,
  day: number,
  id: string,
  modelo: string,
  title: string,
  description: string,
  category: FiscalDeadline['category']
): FiscalDeadline {
  return {
    id,
    title,
    modelo,
    description,
    date: new Date(year, month - 1, day, 20, 0, 0),
    alertDaysBefore: 7,
    category,
  };
}

export function getFiscalDeadlines(year: number): FiscalDeadline[] {
  const deadlines: FiscalDeadline[] = [
    // Resumen anual año anterior
    deadline(
      year,
      1,
      30,
      `${year}-390`,
      '390',
      'Resumen anual IVA (Mod. 390)',
      `Declaración resumen anual del IVA del ejercicio ${year - 1}.`,
      'resumen_anual'
    ),
    deadline(
      year,
      1,
      31,
      `${year}-190`,
      '190',
      'Retenciones trabajo/profesionales (Mod. 190)',
      `Resumen anual retenciones IRPF del ejercicio ${year - 1}.`,
      'resumen_anual'
    ),
    deadline(
      year,
      1,
      31,
      `${year}-180`,
      '180',
      'Retenciones alquileres (Mod. 180)',
      `Resumen anual retenciones alquileres del ejercicio ${year - 1}.`,
      'resumen_anual'
    ),

    // T1 (Jan–Mar) → vence 20 abril
    deadline(
      year,
      4,
      20,
      `${year}-303-T1`,
      '303',
      'IVA 1T · Mod. 303',
      'Liquidación del IVA del primer trimestre (enero–marzo).',
      'iva'
    ),
    deadline(
      year,
      4,
      20,
      `${year}-130-T1`,
      '130',
      'IRPF fraccionado 1T · Mod. 130',
      'Pago fraccionado IRPF autónomos — primer trimestre.',
      'irpf'
    ),
    deadline(
      year,
      4,
      20,
      `${year}-111-T1`,
      '111',
      'Retenciones trabajo 1T · Mod. 111',
      'Retenciones e ingresos a cuenta IRPF — primer trimestre.',
      'irpf'
    ),
    deadline(
      year,
      4,
      20,
      `${year}-115-T1`,
      '115',
      'Retenciones alquiler 1T · Mod. 115',
      'Retenciones alquileres — primer trimestre.',
      'irpf'
    ),

    // T2 (Apr–Jun) → vence 20 julio
    deadline(
      year,
      7,
      20,
      `${year}-303-T2`,
      '303',
      'IVA 2T · Mod. 303',
      'Liquidación del IVA del segundo trimestre (abril–junio).',
      'iva'
    ),
    deadline(
      year,
      7,
      20,
      `${year}-130-T2`,
      '130',
      'IRPF fraccionado 2T · Mod. 130',
      'Pago fraccionado IRPF autónomos — segundo trimestre.',
      'irpf'
    ),
    deadline(
      year,
      7,
      20,
      `${year}-111-T2`,
      '111',
      'Retenciones trabajo 2T · Mod. 111',
      'Retenciones e ingresos a cuenta IRPF — segundo trimestre.',
      'irpf'
    ),
    deadline(
      year,
      7,
      20,
      `${year}-115-T2`,
      '115',
      'Retenciones alquiler 2T · Mod. 115',
      'Retenciones alquileres — segundo trimestre.',
      'irpf'
    ),

    // IS Impuesto Sociedades → vence 25 julio
    deadline(
      year,
      7,
      25,
      `${year}-200`,
      '200',
      'Impuesto sobre Sociedades · Mod. 200',
      `Declaración anual del Impuesto sobre Sociedades del ejercicio ${year - 1}.`,
      'is'
    ),

    // T3 (Jul–Sep) → vence 20 octubre
    deadline(
      year,
      10,
      20,
      `${year}-303-T3`,
      '303',
      'IVA 3T · Mod. 303',
      'Liquidación del IVA del tercer trimestre (julio–septiembre).',
      'iva'
    ),
    deadline(
      year,
      10,
      20,
      `${year}-130-T3`,
      '130',
      'IRPF fraccionado 3T · Mod. 130',
      'Pago fraccionado IRPF autónomos — tercer trimestre.',
      'irpf'
    ),
    deadline(
      year,
      10,
      20,
      `${year}-111-T3`,
      '111',
      'Retenciones trabajo 3T · Mod. 111',
      'Retenciones e ingresos a cuenta IRPF — tercer trimestre.',
      'irpf'
    ),
    deadline(
      year,
      10,
      20,
      `${year}-115-T3`,
      '115',
      'Retenciones alquiler 3T · Mod. 115',
      'Retenciones alquileres — tercer trimestre.',
      'irpf'
    ),

    // T4 (Oct–Dec) → vence 30 enero año siguiente
    deadline(
      year + 1,
      1,
      30,
      `${year}-303-T4`,
      '303',
      'IVA 4T · Mod. 303',
      `Liquidación del IVA del cuarto trimestre ${year} (octubre–diciembre).`,
      'iva'
    ),
    deadline(
      year + 1,
      1,
      30,
      `${year}-130-T4`,
      '130',
      'IRPF fraccionado 4T · Mod. 130',
      `Pago fraccionado IRPF autónomos — cuarto trimestre ${year}.`,
      'irpf'
    ),
    deadline(
      year + 1,
      1,
      31,
      `${year}-111-T4`,
      '111',
      'Retenciones trabajo 4T · Mod. 111',
      `Retenciones e ingresos a cuenta IRPF — cuarto trimestre ${year}.`,
      'irpf'
    ),
    deadline(
      year + 1,
      1,
      31,
      `${year}-115-T4`,
      '115',
      'Retenciones alquiler 4T · Mod. 115',
      `Retenciones alquileres — cuarto trimestre ${year}.`,
      'irpf'
    ),
  ];

  return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getUpcomingDeadlines(daysAhead = 90): FiscalDeadline[] {
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 86_400_000);
  const year = now.getFullYear();
  const deadlines = [
    ...getFiscalDeadlines(year - 1),
    ...getFiscalDeadlines(year),
    ...getFiscalDeadlines(year + 1),
  ];
  return deadlines
    .filter((d) => d.date >= now && d.date <= horizon)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getAllDeadlinesForYear(year: number): FiscalDeadline[] {
  return getFiscalDeadlines(year);
}
