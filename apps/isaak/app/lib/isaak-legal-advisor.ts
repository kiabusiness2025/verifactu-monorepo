// V1.2 — Sub-agente "Asesor legal de contratos".
//
// Recibe el texto de un contrato (en español, derecho civil/mercantil
// español por defecto) y devuelve una revisión estructurada:
//   - resumen, partes, objeto, duración
//   - riesgos clasificados por severidad (alta/media/baja) con
//     cita literal de la cláusula + sugerencia de redacción
//   - cláusulas favorables y recomendaciones generales
//
// NO sustituye al asesoramiento de un abogado colegiado — es revisión
// orientativa para que el usuario sepa qué preguntar y dónde mirar.
//
// Bajo capó usa callLLM con responseFormat: 'json_object' (Claude
// Sonnet primario, GPT-4o fallback). System prompt en `legal-prompt`.

import { callLLM } from '@verifactu/utils';

export const CONTRACT_TYPES = [
  'nda',
  'servicios',
  'arrendamiento',
  'compraventa',
  'laboral',
  'licencia',
  'distribucion',
  'otro',
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export type ContractParty = {
  rol: string;
  identificacion: string;
};

export type ContractRisk = {
  severidad: 'alta' | 'media' | 'baja';
  clausula: string;
  riesgo: string;
  sugerencia: string;
  referenciaLegal?: string | null;
};

export type ContractReview = {
  ok: true;
  tipoDetectado: ContractType;
  resumen: string;
  partes: ContractParty[];
  objetoPrincipal: string;
  duracion: string;
  riesgos: ContractRisk[];
  clausulasFavorables: string[];
  recomendaciones: string[];
  proximosPasos: string[];
  disclaimer: string;
  model: string;
  latencyMs: number;
};

export type ContractReviewError = {
  ok: false;
  error: string;
  message: string;
};

const SYSTEM_PROMPT = `Eres "Asesor Legal" — un sub-agente de Isaak especializado en revisión de contratos bajo derecho español (Código Civil, Código de Comercio, Ley General para la Defensa de Consumidores y Usuarios).

Tu trabajo es revisar el contrato que el usuario te pase y devolver una valoración estructurada en JSON. La revisión debe ser práctica: el lector es un autónomo o pyme, no un letrado.

Reglas:
1. SIEMPRE devuelves JSON válido con el shape indicado abajo. Nada de markdown ni texto fuera del JSON.
2. NUNCA digas que "consulte a un abogado" en cada riesgo — eso ya va en el disclaimer global. Para cada riesgo, da una sugerencia concreta de redacción alternativa.
3. Cita la cláusula LITERAL cuando puedas (entrecomillada). Si es muy larga, resume manteniendo el sentido.
4. Riesgos a buscar por defecto (no exclusivo):
   - Renovación automática sin opt-out claro
   - Penalizaciones desproporcionadas (>10% del valor contractual)
   - Cláusula de exclusividad o no-competencia abusiva
   - Jurisdicción / fuero que perjudica al usuario (especialmente si vive lejos)
   - Modificación unilateral del precio o servicio
   - Limitación de responsabilidad excesiva del proveedor
   - Confidencialidad asimétrica (solo obliga a una parte)
   - Cesión del contrato sin consentimiento
   - Duración indefinida sin causa de desistimiento
   - Cláusulas suelo, gastos hipotecarios, intereses moratorios (B2C bancario)
   - Falta de protección de datos (LOPD/GDPR) cuando aplica
   - Plazos de pago superiores a los legales (Ley 15/2010 — 60 días B2B)
5. Severidad:
   - alta = riesgo económico significativo o nulidad probable
   - media = desequilibrio relevante pero negociable
   - baja = recomendación de mejora, no bloqueo
6. tipoDetectado: si el usuario lo pasa, respétalo. Si no, dedúcelo del contenido.
7. referenciaLegal cuando proceda: cita artículo (ej. "art. 1255 CC", "art. 80 TRLGDCU").

Shape JSON obligatorio:
{
  "tipoDetectado": "nda" | "servicios" | "arrendamiento" | "compraventa" | "laboral" | "licencia" | "distribucion" | "otro",
  "resumen": string,             // 2-4 frases en lenguaje natural
  "partes": [{ "rol": string, "identificacion": string }],
  "objetoPrincipal": string,     // 1-2 frases
  "duracion": string,            // texto libre con plazo, prórroga, etc.
  "riesgos": [
    {
      "severidad": "alta" | "media" | "baja",
      "clausula": string,        // literal o resumen de la cláusula problemática
      "riesgo": string,          // por qué es problemático
      "sugerencia": string,      // texto alternativo concreto
      "referenciaLegal": string | null
    }
  ],
  "clausulasFavorables": [string],
  "recomendaciones": [string],   // máximo 5 — generales, no específicas de una cláusula
  "proximosPasos": [string]      // qué hacer ahora (ej. "negociar la cláusula 5", "validar con abogado", "firmar — sin riesgos altos")
}

Si el texto que te pasan NO parece un contrato, devuelve:
{ "error": "not_a_contract", "message": "El texto no parece un contrato — necesito el documento completo o una sección con cláusulas." }
`;

const DISCLAIMER =
  'Esta revisión es orientativa y se ha generado con IA. No sustituye al consejo de un abogado colegiado. Antes de firmar o de iniciar acciones legales, contrasta con un profesional.';

export type ReviewContractInput = {
  contractText: string;
  contractType?: ContractType | null;
  tenantContext?: {
    name?: string;
    activity?: string;
  };
};

const MIN_CONTRACT_LENGTH = 200; // caracteres
const MAX_CONTRACT_LENGTH = 30_000;

export async function reviewContract(
  input: ReviewContractInput,
): Promise<ContractReview | ContractReviewError> {
  const text = (input.contractText ?? '').trim();
  if (text.length < MIN_CONTRACT_LENGTH) {
    return {
      ok: false,
      error: 'text_too_short',
      message: `El texto del contrato es demasiado corto (mínimo ${MIN_CONTRACT_LENGTH} caracteres). Pega el documento completo o una sección sustancial.`,
    };
  }
  if (text.length > MAX_CONTRACT_LENGTH) {
    return {
      ok: false,
      error: 'text_too_long',
      message: `El texto excede ${MAX_CONTRACT_LENGTH} caracteres. Recórtalo a las secciones más relevantes (objeto, contraprestación, duración, resolución, jurisdicción).`,
    };
  }

  const userContextLines: string[] = [];
  if (input.contractType && input.contractType !== 'otro') {
    userContextLines.push(`Tipo de contrato indicado por el usuario: ${input.contractType}.`);
  }
  if (input.tenantContext?.name) {
    userContextLines.push(`Empresa/usuario: ${input.tenantContext.name}.`);
  }
  if (input.tenantContext?.activity) {
    userContextLines.push(`Actividad: ${input.tenantContext.activity}.`);
  }

  const userMsg = [
    userContextLines.join(' '),
    '',
    'Texto del contrato a revisar:',
    '"""',
    text,
    '"""',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await callLLM({
      feature: 'legal_review',
      instructions: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
      responseFormat: 'json_object',
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response.text) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error: 'invalid_llm_response',
        message: 'El modelo no devolvió un JSON parseable. Reintenta o reduce el tamaño del contrato.',
      };
    }

    if (typeof parsed.error === 'string') {
      return {
        ok: false,
        error: parsed.error,
        message: typeof parsed.message === 'string' ? parsed.message : 'El texto no parece un contrato.',
      };
    }

    const tipoDetectado = (parsed.tipoDetectado as ContractType) ?? 'otro';
    if (!CONTRACT_TYPES.includes(tipoDetectado)) {
      return {
        ok: false,
        error: 'invalid_contract_type',
        message: `Tipo detectado inválido: ${tipoDetectado}.`,
      };
    }

    return {
      ok: true,
      tipoDetectado,
      resumen: String(parsed.resumen ?? ''),
      partes: Array.isArray(parsed.partes) ? (parsed.partes as ContractParty[]) : [],
      objetoPrincipal: String(parsed.objetoPrincipal ?? ''),
      duracion: String(parsed.duracion ?? ''),
      riesgos: Array.isArray(parsed.riesgos)
        ? (parsed.riesgos as ContractRisk[]).filter(
            (r) => r && typeof r === 'object' && typeof r.clausula === 'string',
          )
        : [],
      clausulasFavorables: Array.isArray(parsed.clausulasFavorables)
        ? (parsed.clausulasFavorables as string[]).filter((s) => typeof s === 'string')
        : [],
      recomendaciones: Array.isArray(parsed.recomendaciones)
        ? (parsed.recomendaciones as string[])
            .filter((s) => typeof s === 'string')
            .slice(0, 8)
        : [],
      proximosPasos: Array.isArray(parsed.proximosPasos)
        ? (parsed.proximosPasos as string[]).filter((s) => typeof s === 'string')
        : [],
      disclaimer: DISCLAIMER,
      model: response.model,
      latencyMs: response.latencyMs ?? 0,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'llm_call_failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
