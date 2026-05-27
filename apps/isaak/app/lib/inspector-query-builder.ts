// F11 ↔ F12 — Genera la query auto-formateada que se envía al
// Inspector Capa 2 cuando el usuario pulsa "Consultar al Inspector"
// desde una violación de auditoría.
//
// Pura: sin dependencias DOM ni React. Testeable directamente.

export type ViolationLike = {
  ruleId: string;
  message: string;
  recommendation?: string | null;
  legalBasis?: Array<{ article: string; law: string }> | null;
};

export function buildInspectorQueryFromViolation(v: ViolationLike): string {
  const parts: string[] = [];
  parts.push(`Explica con base normativa BOE la regla "${v.ruleId}".`);
  parts.push(`Contexto: ${v.message}`);
  if (v.recommendation) {
    parts.push(`Recomendación dada: ${v.recommendation}`);
  }
  if (v.legalBasis?.length) {
    const refs = v.legalBasis.map((b) => `${b.article} ${b.law}`).join(', ');
    parts.push(`Refs declaradas: ${refs}`);
  }
  parts.push(
    `Pregunta: ¿qué dice la normativa AEAT/BOE sobre este punto y cómo debería actuar el contribuyente?`,
  );
  return parts.join(' ');
}
