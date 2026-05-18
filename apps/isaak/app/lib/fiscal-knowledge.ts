/**
 * Base de conocimiento fiscal y legal para Isaak.
 *
 * Se inyecta en el system prompt de WhatsApp (y chat) para que el LLM:
 *   1. Cite siempre fuentes oficiales con URLs estables.
 *   2. Incluya preguntas de seguimiento relevantes.
 *   3. No invente datos normativos.
 */

// ── Fuentes oficiales por categoría ───────────────────────────────────────────

export const OFFICIAL_SOURCES = {
  aeat: {
    label: 'AEAT — Sede electrónica',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  aeat_portal: {
    label: 'Agencia Tributaria',
    url: 'https://www.agenciatributaria.es',
  },
  boe: {
    label: 'BOE — Legislación',
    url: 'https://www.boe.es',
  },
  ss: {
    label: 'Seguridad Social',
    url: 'https://www.seg-social.es',
  },
  ss_sede: {
    label: 'SS — Sede electrónica',
    url: 'https://sede.seg-social.gob.es',
  },
  hacienda: {
    label: 'Ministerio de Hacienda',
    url: 'https://www.hacienda.gob.es',
  },
  ipyme: {
    label: 'IPYME — Info pymes y autónomos',
    url: 'https://www.ipyme.org',
  },
  rmc: {
    label: 'Registro Mercantil Central',
    url: 'https://www.rmc.es',
  },
  infoautonomos: {
    label: 'Info autónomos',
    url: 'https://infoautonomos.eleconomista.es',
  },
} as const;

// ── Modelos tributarios principales ───────────────────────────────────────────

export const MODELO_INFO: Record<
  string,
  { nombre: string; descripcion: string; periodicidad: string; url: string }
> = {
  '100': {
    nombre: 'Modelo 100 — Renta (IRPF anual)',
    descripcion:
      'Declaración anual de la renta. Personas físicas y autónomos en estimación directa.',
    periodicidad: 'Anual (abril–junio)',
    url: 'https://www.agenciatributaria.es/AEAT.internet/Inicio/La_Agencia_Tributaria/Campanas/_Campanas_/Renta.shtml',
  },
  '111': {
    nombre: 'Modelo 111 — Retenciones IRPF (trimestral)',
    descripcion:
      'Retenciones e ingresos a cuenta de rendimientos del trabajo, actividades económicas y premios.',
    periodicidad: 'Trimestral (abr, jul, oct, ene)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '115': {
    nombre: 'Modelo 115 — Retenciones alquiler',
    descripcion: 'Retenciones sobre alquileres de inmuebles urbanos.',
    periodicidad: 'Trimestral (abr, jul, oct, ene)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '130': {
    nombre: 'Modelo 130 — Pago fraccionado IRPF (autónomos)',
    descripcion: 'Pago fraccionado del IRPF para autónomos en estimación directa.',
    periodicidad: 'Trimestral (abr, jul, oct, ene)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '131': {
    nombre: 'Modelo 131 — Pago fraccionado (módulos)',
    descripcion: 'Pago fraccionado IRPF para autónomos en estimación objetiva (módulos).',
    periodicidad: 'Trimestral (abr, jul, oct, ene)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '190': {
    nombre: 'Modelo 190 — Resumen anual retenciones',
    descripcion: 'Declaración anual de retenciones e ingresos a cuenta del IRPF.',
    periodicidad: 'Anual (enero)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '200': {
    nombre: 'Modelo 200 — Impuesto de Sociedades',
    descripcion: 'Declaración anual del Impuesto sobre Sociedades para personas jurídicas.',
    periodicidad: 'Anual (6 meses tras cierre fiscal)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '202': {
    nombre: 'Modelo 202 — Pago fraccionado IS',
    descripcion: 'Pago fraccionado del Impuesto sobre Sociedades.',
    periodicidad: 'Trimestral (abr, oct; también dic)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '303': {
    nombre: 'Modelo 303 — IVA trimestral',
    descripcion: 'Autoliquidación trimestral del IVA. El más común para pymes y autónomos.',
    periodicidad: 'Trimestral (abr, jul, oct, ene)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '347': {
    nombre: 'Modelo 347 — Operaciones con terceros',
    descripcion: 'Declaración anual de operaciones con terceras personas superiores a 3.005,06 €.',
    periodicidad: 'Anual (febrero)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '349': {
    nombre: 'Modelo 349 — Operaciones intracomunitarias',
    descripcion: 'Declaración recapitulativa de operaciones con países de la UE.',
    periodicidad: 'Mensual o trimestral según volumen',
    url: 'https://sede.agenciatributaria.gob.es',
  },
  '390': {
    nombre: 'Modelo 390 — Resumen anual IVA',
    descripcion: 'Declaración resumen anual del IVA (no obligatorio para SII).',
    periodicidad: 'Anual (enero)',
    url: 'https://sede.agenciatributaria.gob.es',
  },
};

// ── Preguntas de seguimiento por tema ─────────────────────────────────────────

export const QUICK_FOLLOW_UPS: Record<string, string[]> = {
  iva: ['¿Cuándo es el plazo?', '¿Cómo calcularlo?', '¿IVA deducible?'],
  irpf: ['¿Qué gastos deduzco?', '¿Estimación directa?', '¿Cuándo presento?'],
  autonomos: ['¿Alta en Seguridad Social?', '¿Cuota autónomos?', '¿Gastos deducibles?'],
  facturas: ['¿Qué debe llevar?', '¿Factura simplificada?', '¿Rectificativa?'],
  sociedades: ['¿Cuándo tributo?', '¿Gastos deducibles?', '¿Tipo impositivo?'],
  retenciones: ['¿Qué porcentaje?', '¿Quién retiene?', '¿Cómo presentarlo?'],
  plazos: ['¿Recargo por retraso?', '¿Puedo aplazar?', '¿Sanción si no presento?'],
  laboral: ['¿Alta empleado?', '¿Nómina mínima?', '¿Cotizaciones SS?'],
};

// ── Texto de contexto para inyección en system prompt ─────────────────────────

export function buildFiscalKnowledgeBlock(): string {
  const modelosResumen = Object.entries(MODELO_INFO)
    .map(([num, m]) => `• Modelo ${num}: ${m.descripcion} [${m.periodicidad}]`)
    .join('\n');

  const fuentesResumen = Object.values(OFFICIAL_SOURCES)
    .map((s) => `• ${s.label}: ${s.url}`)
    .join('\n');

  return `
CONOCIMIENTO FISCAL ESPAÑOL (usa estos datos como base de conocimiento; no los inventes):

MODELOS TRIBUTARIOS PRINCIPALES:
${modelosResumen}

FUENTES OFICIALES (cita siempre que corresponda):
${fuentesResumen}

PLAZOS TRIMESTRALES ESTÁNDAR:
• 1T: 1–20 abril | 2T: 1–20 julio | 3T: 1–20 octubre | 4T: 1–20 enero (año siguiente)
• Renta anual: campaña abril–junio | Soc. anual: julio (cierre 31/12)
• Si el último día es festivo, el plazo se traslada al siguiente hábil.

RÉGIMEN FISCAL SIMPLIFICADO (autónomos):
• Estimación directa simplificada: gastos deducibles con límites del 5% de provisiones.
• Estimación objetiva (módulos): cuota fija según actividad, sin registros contables.
• Recargo de equivalencia: minoristas que no facturan a empresas, IVA integrado en compras.

TIPOS DE IVA (vigentes hasta nueva modificación):
• General: 21% | Reducido: 10% | Superreducido: 4% | Exento: 0% (sanidad, educación, etc.)
`.trim();
}

// ── URLs de producto Isaak ─────────────────────────────────────────────────────

export const ISAAK_URLS = {
  register: 'https://isaak.verifactu.business',
  pricing: 'https://isaak.verifactu.business/pricing',
  settings: 'https://isaak.verifactu.business/settings?wl=1',
  connectorClaude: 'https://holded.verifactu.business/conectores/claude',
  connectorChatGPT: 'https://holded.verifactu.business/conectores/chatgpt',
} as const;

// ── Instrucciones de formato para WhatsApp ────────────────────────────────────

export const WA_RESPONSE_FORMAT_INSTRUCTIONS = `
FORMATO DE RESPUESTA EN WHATSAPP:
Al final de tu respuesta, si procede, añade SOLO las líneas que apliquen:

→ FUENTE: [URL oficial] | [título corto]
  (solo si citas normativa o trámite oficial)

→ UPSELL: [URL de Isaak o conector] | [texto botón máx 20 chars]
  (solo si el usuario pregunta por sus datos concretos, menciona Holded, o se beneficiaría claramente de una cuenta)
  URLs disponibles: ${ISAAK_URLS.register} | ${ISAAK_URLS.pricing} | ${ISAAK_URLS.connectorClaude} | ${ISAAK_URLS.connectorChatGPT}

→ SIGUIENTES: Pregunta 1 | Pregunta 2 | Pregunta 3
  (1–3 preguntas de seguimiento lógicas, máx 20 chars cada una)

Omite completamente las líneas que no apliquen. El texto de respuesta NO incluye estas líneas.
`.trim();

// ── Instrucciones adicionales para el modo asesor general (sin datos Holded) ──

export function buildGeneralAdvisorInstructions(): string {
  return `
ROL: Eres un asesor fiscal gratuito. NO tienes acceso a los datos contables del usuario.
Si preguntan por sus cifras reales (su IVA, sus facturas, sus ventas), explica el concepto
y añade → UPSELL apuntando a Isaak o al conector adecuado para que puedan obtenerlo.

CONECTORES DISPONIBLES (para usuarios que quieren conectar Holded con IA):
• Conector Claude (Claude Desktop): ${ISAAK_URLS.connectorClaude}
• Conector ChatGPT: ${ISAAK_URLS.connectorChatGPT}
• Isaak (app web completa con alertas, IVA estimado, cashflow): ${ISAAK_URLS.register}
`.trim();
}
