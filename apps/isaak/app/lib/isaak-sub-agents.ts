// F8 Sub-agents: specialist personas with their own system prompt and a
// narrower tool surface, reusing the existing F2 tool loop. The orchestrator
// (Sonnet on the main /api/chat path) decides via classifier + intent rules
// when to route to a sub-agent instead of answering directly.
//
// F8a ships the fiscal agent only. Banking and gestion agents follow the
// same template and land in subsequent PRs.

import type { ToolCategory } from './isaak-intent-classifier-parser';

export type SubAgentId = 'fiscal';

export type SubAgent = {
  id: SubAgentId;
  label: string;
  description: string;
  systemPrompt: string;
  toolCategories: ToolCategory[]; // categories of tools the agent can use
  maxIterations: number;
  maxOutputTokens: number;
  temperature: number;
};

export const ISAAK_FISCAL_AGENT_PROMPT = `Eres el agente fiscal especializado de Isaak. Tu dominio: IVA (303, 390), retenciones (111, 115), pagos a cuenta (130, 131, 202), declaraciones anuales (100, 200, 714), Verifactu/AEAT, regímenes especiales (recargo de equivalencia, módulos, criterio de caja, REBU), autonomía fiscal y obligaciones para pymes y autónomos en España.

Cuando te invoquen, eres una versión más profunda y precisa de Isaak SOLO en estos temas. Para preguntas fuera de tu dominio (tesorería bancaria, ventas/CRM, calendario), dilo y sugiere que el usuario reformule sin ese encuadre.

PRINCIPIOS (orden estricto):
1. NO INVENTES NÚMEROS. Si necesitas cifras del negocio (facturación, IVA acumulado, retenciones), invoca los tools de Holded. Si no hay datos, dilo.
2. PRECISIÓN > BREVEDAD. En fiscal, equivocarte cuesta dinero al usuario. Cita el modelo concreto (303, 130...), el plazo exacto (20 de abril, 20 de octubre...), el porcentaje aplicable, la base imponible.
3. CONTEXTO ESPAÑOL. Asume normativa AEAT y régimen general salvo que el contexto del workspace indique otro régimen (estimación objetiva/módulos, recargo de equivalencia, criterio de caja).
4. PASOS ACCIONABLES. Si la pregunta es "¿qué hago?", da los pasos en orden con plazos. Si es "¿cuánto pago?", da la fórmula + el cálculo con datos reales del tool.
5. AVISA AL LÍMITE. Si la pregunta entra en planificación fiscal compleja, sociedades patrimoniales, IRNR, operaciones intracomunitarias raras, sucesiones, o cualquier área donde el coste de un error sea alto → recomienda asesor.

ESTILO: español claro, profesional, sin tecnicismos innecesarios pero usando el vocabulario fiscal correcto (cuota, base imponible, repercutido, soportado, devengo, sujeto pasivo). No emojis salvo confirmaciones explícitas.

PLAZOS HABITUALES (memorízalos):
- Modelo 303 (IVA trimestral): 1-20 de abril, julio, octubre. T4: 1-30 enero.
- Modelo 390 (resumen anual IVA): 1-30 enero año siguiente.
- Modelo 130 (IRPF autónomo): 1-20 abril/julio/octubre/enero.
- Modelo 111 (retenciones IRPF): 1-20 abril/julio/octubre/enero.
- Modelo 115 (alquileres): 1-20 abril/julio/octubre/enero.
- Modelo 100 (renta): abril-junio.
- Modelo 200 (IS sociedades): 1-25 julio.
- Modelo 720 (bienes en el extranjero): 1-31 marzo.

Si la fecha actual indica que un plazo está próximo (<14 días) o vencido, MENCIÓNALO en la respuesta sin que pregunten.`;

const REGISTRY: Record<SubAgentId, SubAgent> = {
  fiscal: {
    id: 'fiscal',
    label: 'Agente fiscal',
    description: 'Especialista en IVA, IRPF, modelos AEAT y obligaciones fiscales.',
    systemPrompt: ISAAK_FISCAL_AGENT_PROMPT,
    toolCategories: ['holded'], // fiscal queries need Holded data (invoices, P&L, contacts)
    maxIterations: 8,
    maxOutputTokens: 1500,
    temperature: 0.3, // lower than the orchestrator — fiscal precision matters
  },
};

export function getSubAgent(id: SubAgentId): SubAgent {
  return REGISTRY[id];
}

export function listSubAgents(): SubAgent[] {
  return Object.values(REGISTRY);
}

// --- Routing rules ---
//
// The orchestrator routes to a sub-agent when the classifier categorizes the
// query AND the message contains domain-specific signals. Belt-and-suspenders:
// the classifier might be too greedy (route everything fiscal-adjacent),
// while keyword matching alone can be too narrow (miss paraphrases). The
// combination keeps both precision and recall reasonable.

const FISCAL_KEYWORDS = [
  // Models
  'modelo 303', 'modelo 130', 'modelo 111', 'modelo 115', 'modelo 100',
  'modelo 200', 'modelo 390', 'modelo 720', 'modelo 347', 'modelo 349',
  // Taxes
  'iva', 'irpf', 'impuesto de sociedades', 'retencion', 'retención',
  'recargo de equivalencia', 'criterio de caja', 'inversion del sujeto pasivo',
  // Operations
  'declaracion', 'declaración', 'autoliquidacion', 'autoliquidación',
  'devolucion', 'devolución', 'hacienda', 'aeat', 'verifactu', 'sii',
  'sujeto pasivo', 'base imponible', 'cuota tributaria',
  'epigrafe iae', 'epígrafe iae', 'modulos', 'módulos',
  // Roles/regimes
  'autonomo', 'autónomo', 'pyme', 'sociedad limitada', 'patrimonial',
];

const FISCAL_KEYWORD_SET = new Set(FISCAL_KEYWORDS.map((k) => k.toLowerCase()));

export function detectFiscalIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  for (const kw of FISCAL_KEYWORD_SET) {
    if (normalized.includes(kw)) return true;
  }
  return false;
}

export type RouteToSubAgentInput = {
  message: string;
  classifierCategories: ToolCategory[];
  hasWriteIntent: boolean;
};

// Returns the sub-agent ID to route to, or null for the default path.
// F8a only routes reads to a sub-agent. Write intents stay on the
// orchestrator path so the judge guardrail keeps applying as in F4.
export function pickSubAgent(input: RouteToSubAgentInput): SubAgentId | null {
  if (input.hasWriteIntent) return null;
  if (!detectFiscalIntent(input.message)) return null;
  return 'fiscal';
}
