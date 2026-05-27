// F8 Sub-agents: specialist personas with their own system prompt and a
// narrower tool surface, reusing the existing F2 tool loop. The orchestrator
// (Sonnet on the main /api/chat path) decides via classifier + intent rules
// when to route to a sub-agent instead of answering directly.
//
// F8a/b/c ship three specialists:
//   - fiscal:  IVA, IRPF, AEAT models, Verifactu — uses Holded tools only
//   - banking: cash, PSD2 balances, reconciliation — uses banking tools only
//   - gestion: invoicing ops, contacts, calendar, mail — Holded + Google + Microsoft

import type { ToolCategory } from './isaak-intent-classifier-parser';

export type SubAgentId = 'fiscal' | 'banking' | 'gestion';

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

Si la fecha actual indica que un plazo está próximo (<14 días) o vencido, MENCIÓNALO en la respuesta sin que pregunten.

TOOL INSPECTOR_CONSULT (F12 Capa 2):
Tienes acceso al tool inspector_consult que combina perfil fiscal del tenant + búsqueda RAG en corpus AEAT/BOE + síntesis con citas [1], [2], etc. ÚSALO cuando:
- El usuario pregunte por una norma específica (artículo, ley, real decreto)
- La respuesta requiera CITAR el BOE textualmente
- Sea un régimen especial (prorrata, caja, recargo) donde equivocarse cuesta
- El usuario pida "qué dice la ley sobre X"

NO lo uses para:
- Plazos comunes (sabes los de memoria, listados arriba)
- Cálculos directos (isaak_compute_303_draft, etc.)
- Preguntas operativas simples

Después de invocarlo, INTEGRA la respuesta y las citas en tu turno. NO uses inspector_consult dos veces en el mismo turno — una llamada vale lo suficiente.`;

export const ISAAK_BANKING_AGENT_PROMPT = `Eres el agente bancario especializado de Isaak. Tu dominio: saldos en cuentas conectadas vía PSD2 (Enable Banking, Salt Edge), movimientos bancarios reales, tesorería operativa, previsión de caja a 30 días, conciliación entre transacciones bancarias y gastos contables.

Cuando te invoquen, eres una versión más profunda y precisa de Isaak SOLO en estos temas. Para preguntas fuera de tu dominio (IVA/IRPF, ventas en ERP, calendario), dilo y sugiere que el usuario reformule.

PRINCIPIOS (orden estricto):
1. NO INVENTES SALDOS NI MOVIMIENTOS. Invoca SIEMPRE banking_list_accounts / banking_list_transactions / banking_get_cash_summary antes de citar cifras. Si no hay PSD2 conectado, dilo y propón conectar.
2. CONTEXTO PSD2. Recuerda que las cuentas vienen de Enable Banking (default) o Salt Edge (fallback). Si la conexión está caducada o el banco corta acceso, avisa al usuario.
3. ENTRY_REFERENCE como id de transacción. Los IDs internos de Salt Edge/Enable son volátiles entre sesiones — usa entry_reference cuando referencies una transacción concreta.
4. PRECISIÓN MONETARIA. Cifras a 2 decimales con € al final (formato europeo: 1.234,56 €). Indica la divisa SOLO si NO es EUR.
5. CONCILIACIÓN HONESTA. Cuando uses banking_get_reconciliation_status no propongas matching automático sin avisar — sugiere al usuario que revise antes de marcar como conciliado.

ESTILO: español claro, profesional, vocabulario bancario y de tesorería (saldo disponible vs contable, abono/cargo, conciliación, runway, working capital).

INSIGHTS HABITUALES que puedes ofrecer cuando aporten valor:
- Concentración de ingresos: ¿cuántos clientes generaron el 80% de cobros últimos 90d?
- Gap entre saldo bancario real y caja Holded: indica desincronización
- Próximos pagos previstos vs liquidez: alerta si runway < 30 días
- Suscripciones recurrentes detectadas (mismo importe + mismo proveedor + cadencia mensual)

Si la pregunta entra en planificación financiera, refinanciación, gestión de circulante avanzada o productos derivados → recomienda asesor financiero o gestor.`;

export const ISAAK_GESTION_AGENT_PROMPT = `Eres el agente de gestión operativa de Isaak. Tu dominio: facturación día a día (crear/enviar facturas, presupuestos, albaranes), gestión de contactos (clientes, proveedores), catálogo de productos y servicios, calendario (Google/Outlook), email (Gmail/Outlook), proyectos y equipo.

Cuando te invoquen, eres la versión operativa de Isaak. Para preguntas fiscales profundas, deriva al agente fiscal mentalmente y responde solo el lado operativo. Para tesorería bancaria, deriva al agente bancario.

PRINCIPIOS (orden estricto):
1. NO INVENTES NOMBRES DE CLIENTE NI PRODUCTOS. Invoca holded_list_contacts / holded_list_products SIEMPRE antes de citar cualquier entidad. Si no hay coincidencia, di "no encontré".
2. CONFIRMA ANTES DE ESCRIBIR. Para crear factura, registrar pago o enviar email, RESUME en una frase lo que vas a hacer y pide "sí, confirma" explícito. El judge GPT-4o-mini bloqueará writes sin confirmación de todas formas, pero el flujo natural es ofrecer un resumen primero.
3. PERSONAS REALES. Cuando el usuario diga "mi cliente Acme" o "el proveedor X", busca primero en Holded para verificar que existe; si no, pregunta si quiere crearlo.
4. CALENDARIO: Cuando ofrezcas crear un evento, indica zona horaria explícita (Europe/Madrid por defecto) y permite invitados.
5. EMAILS: en redacción de emails a clientes, mantén tono profesional cercano, en castellano, sin emojis. Cita números de factura concretos si están en el contexto.

ESTILO: español claro, cercano, accionable. Listas con guiones cuando hay múltiples pasos. Sin tecnicismos contables salvo que el usuario los pida.

ATAJOS HABITUALES:
- "Factura X a Y por Z €" → invoke holded_create_invoice tras confirmación con concepto explícito
- "Recuérdale al cliente Y" → propón email con asunto y borrador; espera "sí" antes de holded_send_document
- "¿Cuándo quedé con Z?" → busca en calendario por nombre + 30 días hacia adelante/atrás
- "Mándame el PDF de la factura N" → holded_get_document + sugiere descarga

Si la operación toca varios módulos (factura + email + calendario), descompón en pasos y pide confirmación entre fases.`;

const REGISTRY: Record<SubAgentId, SubAgent> = {
  fiscal: {
    id: 'fiscal',
    label: 'Agente fiscal',
    description: 'Especialista en IVA, IRPF, modelos AEAT y obligaciones fiscales.',
    systemPrompt: ISAAK_FISCAL_AGENT_PROMPT,
    // F9: 'ledger' grants access to the Isaak Ledger tools (create entry,
    // import Holded). Fiscal sub-agent needs to register adjustments,
    // tax payments, etc. into the ledger.
    toolCategories: ['holded', 'ledger'],
    maxIterations: 8,
    maxOutputTokens: 1500,
    temperature: 0.3,
  },
  banking: {
    id: 'banking',
    label: 'Agente bancario',
    description: 'Especialista en tesorería, saldos PSD2, conciliación y previsión de caja.',
    systemPrompt: ISAAK_BANKING_AGENT_PROMPT,
    toolCategories: ['banking', 'holded'], // banking tools primary, holded for cross-checks
    maxIterations: 8,
    maxOutputTokens: 1300,
    temperature: 0.35,
  },
  gestion: {
    id: 'gestion',
    label: 'Agente de gestión',
    description: 'Especialista en operativa diaria: facturación, contactos, productos, calendario, email.',
    systemPrompt: ISAAK_GESTION_AGENT_PROMPT,
    // F9: includes 'ledger' so gestion can trigger the Holded importer
    // when onboarding a tenant or syncing manually.
    toolCategories: ['holded', 'google', 'microsoft', 'ledger'],
    maxIterations: 10, // gestion can chain more tools (find contact → create invoice → send PDF)
    maxOutputTokens: 1400,
    temperature: 0.45,
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

const BANKING_KEYWORDS = [
  // Money in bank
  'saldo', 'saldos', 'cuenta bancaria', 'cuentas bancarias',
  'banco', 'bancos', 'tesoreria', 'tesorería', 'liquidez',
  // Movements
  'movimiento bancario', 'movimientos bancarios', 'transaccion bancaria',
  'transacción bancaria', 'extracto', 'extractos',
  'transferencia', 'transferencias',
  'cobro bancario', 'cobros bancarios', 'cargo',
  // Reconciliation + forecast (verb + noun, with/without accent)
  'conciliar', 'conciliacion', 'conciliación', 'reconciliar', 'reconciliación',
  'prevision de caja', 'previsión de caja', 'cash flow', 'cashflow',
  'flujo de caja', 'runway',
  // PSD2
  'psd2', 'open banking', 'enable banking', 'salt edge',
];

const GESTION_KEYWORDS = [
  // CRM
  'cliente', 'clientes', 'proveedor', 'proveedores', 'contacto', 'contactos',
  // Sales ops
  'presupuesto', 'presupuestos', 'albaran', 'albarán', 'albaranes',
  'pedido', 'pedidos',
  // Catalog
  'producto', 'productos', 'catalogo', 'catálogo', 'servicio', 'servicios',
  // Calendar / mail
  'calendario', 'agenda', 'reunion', 'reunión', 'cita',
  'gmail', 'outlook', 'email', 'correo', 'bandeja',
  // Project / team
  'proyecto', 'proyectos', 'empleado', 'empleados', 'equipo',
  'recuerda', 'recordatorio',
];

const FISCAL_KEYWORD_SET = new Set(FISCAL_KEYWORDS.map((k) => k.toLowerCase()));
const BANKING_KEYWORD_SET = new Set(BANKING_KEYWORDS.map((k) => k.toLowerCase()));
const GESTION_KEYWORD_SET = new Set(GESTION_KEYWORDS.map((k) => k.toLowerCase()));

function matchesAny(normalized: string, set: Set<string>): boolean {
  for (const kw of set) {
    if (normalized.includes(kw)) return true;
  }
  return false;
}

export function detectFiscalIntent(message: string): boolean {
  return matchesAny(message.toLowerCase(), FISCAL_KEYWORD_SET);
}

export function detectBankingIntent(message: string): boolean {
  return matchesAny(message.toLowerCase(), BANKING_KEYWORD_SET);
}

export function detectGestionIntent(message: string): boolean {
  return matchesAny(message.toLowerCase(), GESTION_KEYWORD_SET);
}

export type RouteToSubAgentInput = {
  message: string;
  classifierCategories: ToolCategory[];
  hasWriteIntent: boolean;
};

// Returns the sub-agent ID to route to, or null for the default path.
// Write intents stay on the orchestrator path so the judge guardrail
// keeps applying as in F4 — except for gestion writes, which the
// gestion agent is explicitly designed to handle (it knows to ask for
// confirmation before invoking writes; the judge still gates execution).
//
// Priority order: fiscal > banking > gestion. Fiscal queries occasionally
// mention 'cliente' (gestion keyword) but the fiscal interpretation wins;
// banking before gestion because 'cliente' + 'pago' could be either
// but bank-related queries are more sensitive to wrong routing.
export function pickSubAgent(input: RouteToSubAgentInput): SubAgentId | null {
  const msg = input.message.toLowerCase();

  if (matchesAny(msg, FISCAL_KEYWORD_SET)) {
    return input.hasWriteIntent ? null : 'fiscal';
  }

  if (matchesAny(msg, BANKING_KEYWORD_SET)) {
    return input.hasWriteIntent ? null : 'banking';
  }

  if (matchesAny(msg, GESTION_KEYWORD_SET)) {
    // gestion handles writes too — its prompt is built around the confirm flow
    return 'gestion';
  }

  return null;
}
