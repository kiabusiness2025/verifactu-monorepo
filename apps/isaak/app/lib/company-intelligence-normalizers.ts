import type { LegalForm } from './company-intelligence-types';

// ── Name normalization ────────────────────────────────────────────────────────

const SUFFIX_MAP: Record<string, string> = {
  'SOCIEDAD LIMITADA': 'SL',
  'SOCIEDAD DE RESPONSABILIDAD LIMITADA': 'SL',
  'S.R.L.': 'SL',
  SRL: 'SL',
  'S.L.': 'SL',
  'SOCIEDAD ANONIMA': 'SA',
  'SOCIEDAD ANÓNIMA': 'SA',
  'S.A.': 'SA',
  'SOCIEDAD COOPERATIVA': 'COOP',
  'S.COOP.': 'COOP',
  'S. COOP.': 'COOP',
  SCOOP: 'COOP',
  'COMUNIDAD DE BIENES': 'CB',
  'C.B.': 'CB',
  'SOCIEDAD CIVIL PARTICULAR': 'SCP',
  'S.C.P.': 'SCP',
  ASOCIACION: 'ASOCIACION',
  ASOCIACIÓN: 'ASOCIACION',
  FUNDACION: 'FUNDACION',
  FUNDACIÓN: 'FUNDACION',
};

export function normalizeLegalName(name: string): string {
  let normalized = name.toUpperCase().trim();
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  // Remove accents
  normalized = normalized.normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Replace suffix variants with canonical short form
  for (const [variant, canonical] of Object.entries(SUFFIX_MAP)) {
    const variantNorm = variant.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const escaped = variantNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`(?:^|\\s)${escaped}(?:\\s|$|,)`, 'g'), (m) =>
      m.replace(variantNorm, canonical)
    );
  }
  return normalized.trim();
}

// ── Legal form detection ──────────────────────────────────────────────────────

const FORM_PATTERNS: Array<[RegExp, LegalForm]> = [
  [/\bS\.?L\.?\b|\bSRL\b|SOCIEDAD LIMITADA/i, 'SL'],
  [/\bS\.?A\.?\b|SOCIEDAD ANONIMA|SOCIEDAD ANÓNIMA/i, 'SA'],
  [/\bS\.?\s*COOP\.?\b|SOCIEDAD COOPERATIVA/i, 'COOP'],
  [/\bC\.?B\.?\b|COMUNIDAD DE BIENES/i, 'CB'],
  [/\bS\.?C\.?P\.?\b|SOCIEDAD CIVIL PARTICULAR/i, 'SCP'],
  [/\bASO[CK]IACI[OÓ]N\b/i, 'ASOCIACION'],
  [/\bFUNDACI[OÓ]N\b/i, 'FUNDACION'],
];

// NIF starting letter → CIF entity type → legal form
const CIF_LETTER_FORM: Record<string, LegalForm> = {
  A: 'SA',
  B: 'SL',
  C: 'SCP',
  D: 'SA', // asociación de comanditarias
  E: 'CB',
  F: 'COOP',
  G: 'ASOCIACION',
  H: 'ASOCIACION', // comunidades de propietarios
  N: 'ENTIDAD_EXTRANJERA' as LegalForm, // foreign entity
  P: 'ENTIDAD_EXTRANJERA' as LegalForm,
  Q: 'ENTIDAD_EXTRANJERA' as LegalForm,
  R: 'ASOCIACION', // congregaciones religiosas
  S: 'ENTIDAD_EXTRANJERA' as LegalForm,
  U: 'CB', // uniones temporales de empresas
  V: 'ASOCIACION',
  W: 'ENTIDAD_EXTRANJERA' as LegalForm,
};

export function detectLegalForm(name: string, nif?: string): LegalForm {
  // Try to infer from NIF/CIF prefix first (most reliable)
  if (nif) {
    const normalized = normalizeSpanishNif(nif);
    const firstChar = normalized[0];
    if (/[A-Z]/.test(firstChar) && CIF_LETTER_FORM[firstChar]) {
      const form = CIF_LETTER_FORM[firstChar];
      // Exclude foreign entities not in our LegalForm type
      if (
        form !== ('ENTIDAD_EXTRANJERA' as LegalForm) &&
        ['SL', 'SA', 'COOP', 'CB', 'SCP', 'ASOCIACION', 'FUNDACION'].includes(form)
      ) {
        return form as LegalForm;
      }
    }
    // NIE prefix (X/Y/Z) → individual → AUTONOMO
    if (/^[XYZ]/.test(normalized)) {
      return 'AUTONOMO';
    }
    // Pure 8-digit NIF → individual → AUTONOMO
    if (/^\d{8}[A-Z]$/.test(normalized)) {
      return 'AUTONOMO';
    }
  }

  // Try to infer from name patterns
  for (const [pattern, form] of FORM_PATTERNS) {
    if (pattern.test(name)) return form;
  }

  return 'UNKNOWN';
}

// ── NIF / CIF normalization and validation ────────────────────────────────────

export function normalizeSpanishNif(nif: string): string {
  return nif.toUpperCase().replace(/\s+/g, '').replace(/-/g, '').replace(/^ES/, ''); // strip ES VAT prefix if present
}

const NIF_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

function validateNifIndividual(nif: string): boolean {
  // Format: 8 digits + control letter
  if (!/^\d{8}[A-Z]$/.test(nif)) return false;
  const num = parseInt(nif.slice(0, 8), 10);
  const expected = NIF_CONTROL_LETTERS[num % 23];
  return nif[8] === expected;
}

function validateNie(nie: string): boolean {
  // Format: X/Y/Z + 7 digits + control letter
  if (!/^[XYZ]\d{7}[A-Z]$/.test(nie)) return false;
  const substituted = nie.replace('X', '0').replace('Y', '1').replace('Z', '2');
  const num = parseInt(substituted.slice(0, 8), 10);
  const expected = NIF_CONTROL_LETTERS[num % 23];
  return nie[8] === expected;
}

const CIF_ODD_SUM: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
  (d) => [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][d]
);

function validateCif(cif: string): boolean {
  // Format: letter + 7 digits + control char (digit or letter)
  if (!/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/.test(cif)) return false;
  const digits = cif.slice(1, 8).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    if (i % 2 === 0) {
      // odd positions (1-indexed): apply special table
      sum += CIF_ODD_SUM[digits[i]];
    } else {
      sum += digits[i];
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10;
  const controlLetter = 'JABCDEFGHI'[controlDigit];
  const last = cif[8];
  return last === String(controlDigit) || last === controlLetter;
}

export function validateNifFormat(nif: string): boolean {
  const n = normalizeSpanishNif(nif);
  if (!n || n.length < 9) return false;
  return validateNifIndividual(n) || validateNie(n) || validateCif(n);
}

// ── VAT number normalization ──────────────────────────────────────────────────

export function normalizeVatNumber(input: string, country = 'ES'): string {
  const cleaned = input.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  if (country === 'ES') {
    // Ensure ES prefix
    return cleaned.startsWith('ES') ? cleaned : `ES${cleaned}`;
  }
  // For other countries, just return cleaned as-is
  return cleaned;
}
