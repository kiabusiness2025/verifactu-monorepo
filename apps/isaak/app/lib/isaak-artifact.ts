/**
 * Isaak Artifacts — tipo central y helpers.
 *
 * Un artifact es un objeto de datos estructurado que el LLM puede generar
 * via tool call y que la UI renderiza en el panel lateral (visual, excel, pdf, word).
 */
import { randomUUID } from 'crypto';

// ── Tipo central ──────────────────────────────────────────────────────────────

export type ArtifactType = 'visual' | 'excel' | 'pdf' | 'word';

export type IsaakArtifact = {
  id: string;
  type: ArtifactType;
  title: string;
  // Visual (charts + table)
  chartType?: 'bar' | 'line' | 'area' | 'pie';
  chartData?: Array<Record<string, string | number>>;
  chartKeys?: { nameKey: string; valueKeys: string[] };
  tableHeaders?: string[];
  tableRows?: string[][];
  summary?: string;
  // Download artifacts
  downloadUrl?: string;
  filename?: string;
  // Cross-format download links (populated for visual artifacts)
  downloadLinks?: { excel?: string; pdf?: string; word?: string };
};

// ── Constructores ─────────────────────────────────────────────────────────────

export function makeVisualArtifact(opts: {
  title: string;
  chartType: NonNullable<IsaakArtifact['chartType']>;
  chartData: NonNullable<IsaakArtifact['chartData']>;
  chartKeys: NonNullable<IsaakArtifact['chartKeys']>;
  tableHeaders: string[];
  tableRows: string[][];
  summary?: string;
}): IsaakArtifact {
  return { id: randomUUID(), type: 'visual', ...opts };
}

export function makeDownloadArtifact(opts: {
  type: 'excel' | 'pdf' | 'word';
  title: string;
  downloadUrl: string;
  filename: string;
}): IsaakArtifact {
  return { id: randomUUID(), ...opts };
}

// ── Guards ────────────────────────────────────────────────────────────────────

export function isIsaakArtifact(value: unknown): value is IsaakArtifact {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    ['visual', 'excel', 'pdf', 'word'].includes(v.type as string) &&
    typeof v.title === 'string'
  );
}

// ── Iconos por tipo ───────────────────────────────────────────────────────────

export const ARTIFACT_ICON: Record<ArtifactType, string> = {
  visual: '📊',
  excel: '📗',
  pdf: '📄',
  word: '📝',
};

export const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  visual: 'Informe visual',
  excel: 'Excel',
  pdf: 'PDF',
  word: 'Word',
};
