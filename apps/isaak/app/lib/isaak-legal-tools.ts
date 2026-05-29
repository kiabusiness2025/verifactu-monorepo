// V1.2 — LLM tools del sub-agente Asesor Legal.
//
// Patrón paralelo al de isaak-report-tools.ts: una lista de tools con
// JSON Schema, un dispatcher executeLegalTool, y un predicate
// isLegalToolName. Se registra en isaak-tools-registry.ts.
//
// Disponible siempre (read-only, no requiere conector externo). La tool
// invoca un sub-LLM con system prompt especializado en derecho español.

import {
  reviewContract,
  CONTRACT_TYPES,
  type ContractType,
} from './isaak-legal-advisor';

export const LEGAL_CHAT_TOOLS = [
  {
    name: 'isaak_review_contract',
    description:
      'Sub-agente Asesor Legal: revisa un contrato y devuelve resumen, partes, objeto, duración, riesgos clasificados por severidad (alta/media/baja) con sugerencia de redacción alternativa, cláusulas favorables, recomendaciones y próximos pasos. Derecho español por defecto. NO sustituye a un abogado — incluye disclaimer al final. Usa esta tool cuando el usuario pegue un contrato o pida revisión de un texto contractual.',
    input_schema: {
      type: 'object',
      properties: {
        contractText: {
          type: 'string',
          description:
            'Texto completo o sección sustancial del contrato a revisar. Entre 200 y 30000 caracteres.',
        },
        contractType: {
          type: ['string', 'null'],
          enum: [...CONTRACT_TYPES, null],
          description:
            'Tipo de contrato si el usuario lo indica. Si no, déjalo null y el sub-agente lo detectará.',
        },
      },
      required: ['contractText'],
    },
  },
] as const;

export type LegalToolName = (typeof LEGAL_CHAT_TOOLS)[number]['name'];

const LEGAL_TOOL_NAMES = new Set<string>(LEGAL_CHAT_TOOLS.map((t) => t.name));

export function isLegalToolName(name: string): name is LegalToolName {
  return LEGAL_TOOL_NAMES.has(name);
}

export type LegalToolContext = {
  tenantId: string;
  userId: string;
  tenantName?: string | null;
  tenantActivity?: string | null;
};

export async function executeLegalTool(
  ctx: LegalToolContext,
  name: LegalToolName,
  input: unknown,
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;

  if (name === 'isaak_review_contract') {
    const contractText = String(args.contractText ?? '');
    const rawType = args.contractType;
    const contractType =
      typeof rawType === 'string' && (CONTRACT_TYPES as readonly string[]).includes(rawType)
        ? (rawType as ContractType)
        : null;

    const result = await reviewContract({
      contractText,
      contractType,
      tenantContext: {
        name: ctx.tenantName ?? undefined,
        activity: ctx.tenantActivity ?? undefined,
      },
    });

    if (!result.ok) return result;

    const riesgosAltos = result.riesgos.filter((r) => r.severidad === 'alta').length;
    const riesgosMedios = result.riesgos.filter((r) => r.severidad === 'media').length;
    return {
      ...result,
      message: `Revisión legal completada. Tipo: ${result.tipoDetectado}. Riesgos detectados: ${riesgosAltos} alto(s), ${riesgosMedios} medio(s), ${result.riesgos.length - riesgosAltos - riesgosMedios} bajo(s). Modelo: ${result.model}. Recuerda que es revisión orientativa — el disclaimer va al final.`,
    };
  }

  return {
    ok: false,
    error: 'unknown_tool',
    message: `Legal tool desconocida: ${name}.`,
  };
}
