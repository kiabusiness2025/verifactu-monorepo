// C-A3 — Parser puro de justificantes AEAT.
//
// AEAT envía a la DEH un "Justificante de presentación" cuando se ha
// confirmado una autoliquidación. El título suele ser una cadena tipo:
//   "Justificante de presentación modelo 303 - 2T 2026"
//   "Justificante presentación 130 1T/2026"
//   "Notificación de aceptación del modelo 111 ejercicio 2026 periodo 2T"
//
// Este módulo extrae `model` + `period` para que el servicio C-A3 pueda
// hacer match con el IsaakTaxReturn correspondiente y adjuntar la URL
// del PDF a `IsaakTaxReturn.attachmentUrl`.
//
// Puro: no toca Prisma. La integración con DB vive en
// `aeat-sede-sync.ts`.

export type JustificanteMatch = {
  model: string; // '303' | '130' | '111' | '115' | etc.
  period: string; // 'Q1-2026' | 'M03-2026' | 'A-2025'
  confidence: 'high' | 'medium' | 'low';
};

// Modelos AEAT reconocidos. Mantener alineado con TAX_RETURN_MODELS en
// isaak-tax-returns.ts para que el match no apunte a un modelo
// inexistente en la tabla.
const KNOWN_MODELS = new Set([
  '303', '130', '111', '115', '180', '190',
  '200', '202', '347', '349', '390', '720', '100', '714',
]);

// Detecta presencia de "justificante" o sinónimos AEAT.
const JUSTIFICANTE_KEYWORDS = /justificante|acept(aci[óo]n|ado)|confirmaci[óo]n.*presentaci[óo]n/i;

export function isJustificanteTitle(title: string): boolean {
  if (!title) return false;
  return JUSTIFICANTE_KEYWORDS.test(title);
}

// Extrae el modelo (303, 130, ...) de un título AEAT. Devuelve null si
// no se encuentra ninguno de los reconocidos.
function extractModel(title: string): string | null {
  // Busca un número de 3 dígitos precedido por "modelo" o aislado entre
  // otros caracteres. Se prioriza el primer match contra KNOWN_MODELS.
  const regex = /\b(?:modelo\s+)?(\d{3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(title)) !== null) {
    if (KNOWN_MODELS.has(m[1]!)) return m[1]!;
  }
  return null;
}

// Extrae el período de un título AEAT, convirtiendo a formato interno
// 'Q1-2026' | 'M03-2026' | 'A-2025'. Reconoce:
//   "1T 2026", "1T/2026", "T1 2026", "2T-2026"
//   "Enero 2026", "01/2026", "ejercicio 2026 periodo 2T"
//   "ejercicio 2025" (sin periodo → anual)
export function extractPeriod(title: string): string | null {
  const norm = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  // Año: cualquier 20XX presente
  const yearMatch = norm.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = yearMatch[1]!;

  // Trimestre: '1T 2026', 'T1 2026', '2t/2026', 'periodo 2t'
  const trimRegexes = [
    /\b([1-4])t\b/, // 1t, 2t (lo más común)
    /\bt([1-4])\b/, // t1, t2
    /periodo\s+([1-4])\s*t/, // "periodo 2 t"
  ];
  for (const r of trimRegexes) {
    const m = norm.match(r);
    if (m) return `Q${m[1]}-${year}`;
  }

  // Mensual: '01/2026' o 'enero 2026'
  const monthNumeric = norm.match(/\b(0[1-9]|1[0-2])\/(20\d{2})\b/);
  if (monthNumeric) return `M${monthNumeric[1]}-${monthNumeric[2]}`;
  const monthsEs: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  for (const [k, v] of Object.entries(monthsEs)) {
    if (norm.includes(k)) return `M${v}-${year}`;
  }

  // Resumen anual / ejercicio → A-YYYY
  if (/\bejercicio\b|\banual\b|\bresumen\s+anual\b/.test(norm)) {
    return `A-${year}`;
  }

  return null;
}

export function parseJustificanteTitle(title: string): JustificanteMatch | null {
  if (!isJustificanteTitle(title)) return null;
  const model = extractModel(title);
  if (!model) return null;
  const period = extractPeriod(title);
  if (!period) return null;

  // Confianza heurística: el match es high si el título contiene
  // explícitamente "modelo X" o "presentación modelo X". Si el número
  // se infirió sin la palabra "modelo", la confianza baja.
  const explicitModel = new RegExp(`modelo\\s+${model}\\b`, 'i').test(title);
  const explicitPeriod =
    /\d{4}/.test(title) && (period.startsWith('Q') ? /\dT\b|T\d\b/i.test(title) : true);
  const confidence: JustificanteMatch['confidence'] =
    explicitModel && explicitPeriod ? 'high' : explicitModel || explicitPeriod ? 'medium' : 'low';

  return { model, period, confidence };
}
