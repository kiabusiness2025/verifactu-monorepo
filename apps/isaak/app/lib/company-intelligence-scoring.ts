import type {
  CompanyMatch,
  CompanyMatchScore,
  CompanyProfileInput,
} from './company-intelligence-types';
import { normalizeLegalName, normalizeSpanishNif } from './company-intelligence-normalizers';

// ── String similarity ─────────────────────────────────────────────────────────

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches: boolean[] = new Array(a.length).fill(false);
  const bMatches: boolean[] = new Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ── Scoring logic ─────────────────────────────────────────────────────────────

export function scoreCompanyMatch(
  input: CompanyProfileInput,
  candidate: CompanyMatch
): CompanyMatchScore {
  const reasons: string[] = [];
  let score = 0;

  // 1. NIF exact match — strongest signal (40 pts)
  if (input.nif && candidate.nif) {
    const normInput = normalizeSpanishNif(input.nif);
    const normCand = normalizeSpanishNif(candidate.nif);
    if (normInput === normCand) {
      score += 40;
      reasons.push('NIF exact match');
    } else {
      // NIF mismatch is a strong negative
      score -= 30;
      reasons.push('NIF mismatch');
    }
  }

  // 2. VAT number match (20 pts)
  if (input.vatNumber && candidate.vatNumber) {
    const normInput = input.vatNumber.toUpperCase().replace(/\s/g, '');
    const normCand = candidate.vatNumber.toUpperCase().replace(/\s/g, '');
    if (normInput === normCand) {
      score += 20;
      reasons.push('VAT number exact match');
    }
  }

  // 3. Legal name similarity (30 pts)
  if (input.legalName && candidate.legalName) {
    const normInput = normalizeLegalName(input.legalName);
    const normCand = normalizeLegalName(candidate.legalName);
    const similarity = jaroWinkler(normInput, normCand);
    if (similarity === 1) {
      score += 30;
      reasons.push('Legal name exact match');
    } else if (similarity >= 0.92) {
      score += 22;
      reasons.push(`Legal name near match (${(similarity * 100).toFixed(0)}%)`);
    } else if (similarity >= 0.8) {
      score += 12;
      reasons.push(`Legal name partial match (${(similarity * 100).toFixed(0)}%)`);
    } else if (similarity < 0.5) {
      score -= 10;
      reasons.push('Legal name dissimilar');
    }
  }

  // 4. Province match (10 pts)
  if (input.province && candidate.province) {
    const normInput = input.province.toUpperCase().trim();
    const normCand = candidate.province.toUpperCase().trim();
    if (normInput === normCand) {
      score += 10;
      reasons.push('Province match');
    }
  }

  // Clamp to 0–100
  const finalScore = Math.min(100, Math.max(0, score));

  let confidence: CompanyMatchScore['confidence'];
  if (finalScore >= 70) confidence = 'HIGH';
  else if (finalScore >= 40) confidence = 'MEDIUM';
  else confidence = 'LOW';

  return { score: finalScore, confidence, reasons };
}
