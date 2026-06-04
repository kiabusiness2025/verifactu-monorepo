// V1.2 — LLM tools de memoria a largo plazo para Isaak.
//
// La RETRIEVE ya estaba: retrieveFactsForChat() inyecta hechos relevantes
// al system prompt en cada turno. Aquí exponemos al LLM la capacidad de
// ESCRIBIR (guardar) y BORRAR hechos durante la conversación.
//
// Cuando el usuario dice "recuerda que mi NIF es X" o "ya no facturo a
// Acme", el LLM llama estas tools y persiste/borra el fact en la tabla
// IsaakLongTermMemory (pgvector). En el siguiente turno, retrieve lo
// recupera por similitud semántica si vuelve a ser relevante.
//
// Las tools son READ_ONLY desde el punto de vista del judge (no escriben
// en sistemas externos del cliente) pero técnicamente mutan la tabla de
// memoria. Es información del propio usuario sobre sí mismo — no requiere
// confirmación adicional. Se gating por categoría 'memory'.

import {
  storeMemoryFact,
  deleteMemoryFact,
  type FactType,
} from './isaak-long-term-memory';

const FACT_TYPES: FactType[] = ['preference', 'history', 'decision', 'profile', 'other'];

export const MEMORY_CHAT_TOOLS = [
  {
    name: 'isaak_remember',
    description:
      'Guarda un hecho a largo plazo sobre el usuario o su empresa para recordarlo en futuras conversaciones. Úsalo cuando el usuario te diga explícitamente "recuerda X" o cuando aprendas algo importante sobre su negocio que querrás reusar (NIF, sector, sistema de IVA, preferencias de comunicación, decisiones tomadas, etc.). Mantén los hechos breves (1 frase) y autocontenidos — se buscarán por similitud semántica.',
    input_schema: {
      type: 'object',
      properties: {
        fact: {
          type: 'string',
          description:
            'Hecho a recordar, en una frase. Ejemplos: "El NIF de la empresa es B12345678", "El usuario prefiere respuestas breves y sin tecnicismos", "La empresa factura en régimen de caja del IVA".',
        },
        factType: {
          type: 'string',
          enum: [...FACT_TYPES],
          description:
            'Tipo del hecho: preference (gustos/estilo del usuario), profile (datos fijos del negocio: NIF, sector, régimen), decision (decisión tomada para futuro), history (acción/evento pasado relevante), other.',
        },
      },
      required: ['fact', 'factType'],
    },
  },
  {
    name: 'isaak_forget',
    description:
      'Borra un hecho previamente guardado en la memoria. Úsalo cuando el usuario diga "olvida X" o cuando un hecho deje de ser válido (ej. "ya no soy autónomo, ahora soy SL"). Necesitas el factId que aparece en los hechos recuperados (campo id) en el bloque de memoria al inicio del turno.',
    input_schema: {
      type: 'object',
      properties: {
        factId: {
          type: 'string',
          description: 'UUID del hecho a borrar.',
        },
      },
      required: ['factId'],
    },
  },
] as const;

export type MemoryToolName = (typeof MEMORY_CHAT_TOOLS)[number]['name'];
const MEMORY_TOOL_NAMES = new Set<string>(MEMORY_CHAT_TOOLS.map((t) => t.name));

export function isMemoryToolName(name: string): name is MemoryToolName {
  return MEMORY_TOOL_NAMES.has(name);
}

export type MemoryToolContext = {
  tenantId: string;
  userId: string;
  conversationId?: string | null;
};

export async function executeMemoryTool(
  ctx: MemoryToolContext,
  name: MemoryToolName,
  input: unknown,
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;

  if (name === 'isaak_remember') {
    const fact = typeof args.fact === 'string' ? args.fact.trim() : '';
    const factType = args.factType as FactType;
    if (!fact || fact.length < 3) {
      return {
        ok: false,
        error: 'invalid_fact',
        message: 'El hecho debe tener al menos 3 caracteres y describir algo concreto.',
      };
    }
    if (fact.length > 500) {
      return {
        ok: false,
        error: 'fact_too_long',
        message: 'El hecho es demasiado largo (máx 500 caracteres). Resúmelo.',
      };
    }
    if (!FACT_TYPES.includes(factType)) {
      return {
        ok: false,
        error: 'invalid_fact_type',
        message: `factType debe ser uno de: ${FACT_TYPES.join(', ')}.`,
      };
    }
    try {
      const result = await storeMemoryFact({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        conversationId: ctx.conversationId ?? null,
        fact,
        factType,
        source: 'user',
        confidence: 1.0,
      });
      return {
        ok: true,
        id: result.id,
        fact,
        factType,
        message: `Hecho guardado. Lo recordaré en futuras conversaciones cuando sea relevante.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'store_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_forget') {
    const factId = typeof args.factId === 'string' ? args.factId.trim() : '';
    if (!factId) {
      return {
        ok: false,
        error: 'invalid_fact_id',
        message: 'factId es obligatorio.',
      };
    }
    try {
      const result = await deleteMemoryFact({
        tenantId: ctx.tenantId,
        factId,
      });
      if (result.deleted === 0) {
        return {
          ok: false,
          error: 'fact_not_found',
          message: 'No encontré ese hecho. Puede que ya estuviera borrado o pertenezca a otro usuario.',
        };
      }
      return { ok: true, deleted: result.deleted, message: 'Hecho olvidado.' };
    } catch (err) {
      return {
        ok: false,
        error: 'delete_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    ok: false,
    error: 'unknown_tool',
    message: `Memory tool desconocida: ${name}.`,
  };
}
