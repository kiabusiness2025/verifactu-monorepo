// V1.4.5 — Detector ligero de idioma para responder al usuario en la
// lengua en que escribe (español, catalán, gallego, euskera, inglés).
//
// Usa `franc-min` (ya dep) que reconoce 86 lenguas a partir de un
// fragmento de texto. Para textos cortos (<25 chars) hacemos fallback a
// heurísticas léxicas — palabras muy características de cada lengua.
//
// El resultado se inyecta como un hint en el system prompt:
// "Responde en <idioma>. Si dudas, usa español."

import { franc } from 'franc-min';

export type SupportedLanguage = 'es' | 'ca' | 'gl' | 'eu' | 'en';

const ISO_TO_SUPPORTED: Record<string, SupportedLanguage> = {
  spa: 'es',
  cat: 'ca',
  glg: 'gl',
  eus: 'eu',
  eng: 'en',
};

// Marcadores léxicos por idioma. Cada array tiene tokens que aparecen
// con frecuencia en esa lengua y son raros o inexistentes en castellano.
// Detección por scoring: la lengua con más hits gana.
const CATALAN_MARKERS = [
  /\b(aquest|aquesta|aquests|aquestes|també|però|tinc|haver|haig|amb|això|què|quan|com|millor|manera|meva|teva|seua|nostre|nostra|vostre|vostra|els|les|dels|llei|cobrar|pagar|impostos|facturació|m'agrada|voldria|hauria|donar|fer|moltes|gràcies)\b/i,
  /\bl'[a-záéíóúàèíòùç]+/i, // apóstrofe característico
];
const GALICIAN_MARKERS = [
  /\b(teño|tes|aínda|máis|moitas|onte|hoxe|aínda|dende|ola|pode|xa|cousa|imposto|impostos|grazas|axuda|negocio|deica|ten|conta|nada|moito|moi|estás|estamos|ata|sabe|sabes|ningún|veiga|carballo)\b/i,
];
const BASQUE_MARKERS = [
  /\b(kaixo|eskerrik|egun|gehiago|laguntza|nire|zure|hori|hau|eta|bat|bi|hiru|nola|zer|noiz|bezala|daiteke|behar|daude|ditugu|haien|asko|zenbat|gabe|hori|hori da)\b/i,
];
const ENGLISH_MARKERS = [
  /\b(the|you|your|I|we|us|please|thanks|hi|hello|how|what|when|where|can|could|would|should|tax|invoice|client|account|need|help|much|many)\b/,
];

function countMatches(text: string, regexes: RegExp[]): number {
  let total = 0;
  for (const re of regexes) {
    const matches = text.match(new RegExp(re.source, re.flags + 'g'));
    if (matches) total += matches.length;
  }
  return total;
}

const LANG_LABELS: Record<SupportedLanguage, string> = {
  es: 'español',
  ca: 'català',
  gl: 'galego',
  eu: 'euskera',
  en: 'English',
};

function detectByHeuristics(text: string): SupportedLanguage | null {
  // Scoring: contamos hits de markers de cada lengua y nos quedamos con
  // el ganador SOLO si tiene >= 2 hits o más del doble que la siguiente.
  const scores: Record<Exclude<SupportedLanguage, 'es'>, number> = {
    ca: countMatches(text, CATALAN_MARKERS),
    gl: countMatches(text, GALICIAN_MARKERS),
    eu: countMatches(text, BASQUE_MARKERS),
    en: countMatches(text, ENGLISH_MARKERS),
  };
  const entries = (Object.entries(scores) as [Exclude<SupportedLanguage, 'es'>, number][]).sort(
    ([, a], [, b]) => b - a,
  );
  const [topLang, topScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;
  if (topScore >= 2 || (topScore >= 1 && topScore > secondScore * 2)) {
    return topLang;
  }
  return null;
}

/**
 * Detecta el idioma del último mensaje del usuario. Devuelve 'es' como
 * fallback si no hay señal clara. Heurísticas léxicas tienen prioridad
 * — franc-min se confunde mucho entre lenguas peninsulares.
 */
export function detectUserLanguage(text: string): SupportedLanguage {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 'es';

  const heuristic = detectByHeuristics(trimmed);
  if (heuristic) return heuristic;

  // Solo intentamos franc para textos largos donde puede dar info útil.
  if (trimmed.length < 60) return 'es';

  try {
    const code = franc(trimmed, {
      minLength: 30,
      only: ['spa', 'cat', 'glg', 'eus', 'eng'],
    });
    if (code === 'und') return 'es';
    return ISO_TO_SUPPORTED[code] ?? 'es';
  } catch {
    return 'es';
  }
}

/**
 * Genera el bloque de hint para concatenar al system prompt.
 * Devuelve cadena vacía si el idioma es español (default — no hace falta hint).
 */
export function buildLanguageHint(lang: SupportedLanguage): string {
  if (lang === 'es') return '';
  return [
    `== Idioma del usuario ==`,
    `El usuario te ha escrito en ${LANG_LABELS[lang]}. RESPONDE EN ${LANG_LABELS[lang]}.`,
    'Si no estás seguro de algún término técnico fiscal, usa el español como respaldo y explícalo brevemente.',
    'Cuando el usuario cambie de idioma, cambia tú también.',
  ].join('\n');
}
