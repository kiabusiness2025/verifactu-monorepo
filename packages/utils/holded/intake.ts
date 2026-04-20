export const HOLDED_ROLE_VALUES = [
  'autonomo',
  'administrador',
  'gerente',
  'financiero',
  'otro',
] as const;

export type HoldedRoleValue = (typeof HOLDED_ROLE_VALUES)[number];

export const HOLDED_ROLE_OPTIONS: Array<{ value: HoldedRoleValue; label: string }> = [
  { value: 'autonomo', label: 'Autonomo' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'financiero', label: 'Financiero' },
  { value: 'otro', label: 'Otro' },
];

export const CNAE_SECTION_OPTIONS = [
  { value: 'A', label: 'Agricultura, ganaderia, silvicultura y pesca' },
  { value: 'B', label: 'Industrias extractivas' },
  { value: 'C', label: 'Industria manufacturera' },
  { value: 'D', label: 'Suministro de energia electrica, gas, vapor y aire acondicionado' },
  { value: 'E', label: 'Suministro de agua, saneamiento y gestion de residuos' },
  { value: 'F', label: 'Construccion' },
  { value: 'G', label: 'Comercio y reparacion de vehiculos de motor y motocicletas' },
  { value: 'H', label: 'Transporte y almacenamiento' },
  { value: 'I', label: 'Hosteleria' },
  { value: 'J', label: 'Informacion y comunicaciones' },
  { value: 'K', label: 'Actividades financieras y de seguros' },
  { value: 'L', label: 'Actividades inmobiliarias' },
  { value: 'M', label: 'Actividades profesionales, cientificas y tecnicas' },
  { value: 'N', label: 'Actividades administrativas y servicios auxiliares' },
  { value: 'O', label: 'Administracion publica, defensa y Seguridad Social obligatoria' },
  { value: 'P', label: 'Educacion' },
  { value: 'Q', label: 'Actividades sanitarias y de servicios sociales' },
  { value: 'R', label: 'Actividades artisticas, recreativas y de entretenimiento' },
  { value: 'S', label: 'Otros servicios' },
  { value: 'T', label: 'Actividades de los hogares como empleadores y para uso propio' },
  { value: 'U', label: 'Organizaciones y organismos extraterritoriales' },
] as const;

export const CNAE_SECTION_CODES = CNAE_SECTION_OPTIONS.map((option) => option.value) as [
  (typeof CNAE_SECTION_OPTIONS)[number]['value'],
  ...(typeof CNAE_SECTION_OPTIONS)[number]['value'][],
];

export function normalizeOptionalEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || null;
}

export function normalizeTaxId(value: unknown) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toUpperCase() : null;
}

export function isHoldedRoleValue(value: unknown): value is HoldedRoleValue {
  return typeof value === 'string' && HOLDED_ROLE_VALUES.includes(value as HoldedRoleValue);
}

export function parseHoldedRoleValue(value: unknown): HoldedRoleValue | null {
  return isHoldedRoleValue(value) ? value : null;
}

export function isValidSpanishTaxId(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nifLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';

  if (/^[0-9]{8}[A-Z]$/.test(normalized)) {
    const number = Number.parseInt(normalized.slice(0, 8), 10);
    return nifLetters[number % 23] === normalized.slice(-1);
  }

  if (/^[XYZ][0-9]{7}[A-Z]$/.test(normalized)) {
    const prefix = normalized[0] === 'X' ? '0' : normalized[0] === 'Y' ? '1' : '2';
    const number = Number.parseInt(`${prefix}${normalized.slice(1, 8)}`, 10);
    return nifLetters[number % 23] === normalized.slice(-1);
  }

  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(normalized)) {
    const letter = normalized[0];
    const digits = normalized.slice(1, 8);
    const control = normalized.slice(-1);
    let sumEven = 0;
    let sumOdd = 0;

    for (let index = 0; index < digits.length; index += 1) {
      const digit = Number.parseInt(digits[index], 10);
      if ((index + 1) % 2 === 0) {
        sumEven += digit;
      } else {
        const doubled = digit * 2;
        sumOdd += Math.floor(doubled / 10) + (doubled % 10);
      }
    }

    const total = sumEven + sumOdd;
    const controlDigit = (10 - (total % 10)) % 10;
    const controlLetter = 'JABCDEFGHI'[controlDigit];

    if ('PQRSNW'.includes(letter)) {
      return control === controlLetter;
    }

    if ('ABEH'.includes(letter)) {
      return control === String(controlDigit);
    }

    return control === String(controlDigit) || control === controlLetter;
  }

  return false;
}

export function isLikelySpanishPhone(value: string) {
  const normalized = value.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+34')) {
    const national = normalized.slice(3);
    return /^[6789]\d{8}$/.test(national);
  }
  if (normalized.startsWith('0034')) {
    const national = normalized.slice(4);
    return /^[6789]\d{8}$/.test(national);
  }
  return /^[6789]\d{8}$/.test(normalized);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function splitNameParts(value: string | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
}

export function buildFullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

export function getHoldedRoleLabel(value?: string | null) {
  if (!value) return null;
  return HOLDED_ROLE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function getCnaeSectionLabel(input: { code?: string | null; fallback?: string | null }) {
  if (input.code) {
    return CNAE_SECTION_OPTIONS.find((option) => option.value === input.code)?.label || null;
  }

  return input.fallback ?? null;
}
