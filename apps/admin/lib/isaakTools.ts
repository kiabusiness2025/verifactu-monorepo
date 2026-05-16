/**
 * Herramientas y configuración compartidas del copiloto Isaak admin.
 * Usadas por /api/admin/isaak/chat y /api/admin/isaak/smoke.
 */

import { query } from '@/lib/db';

export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const MODEL = 'claude-haiku-4-5-20251001';
export const MAX_TOKENS = 2048;
export const MAX_TOOL_ROUNDS = 5;

export const SYSTEM_PROMPT = `Eres Isaak, el copiloto de administración de Verifactu Business.
Tienes acceso a herramientas que consultan la base de datos en tiempo real.
Responde siempre en español. Sé conciso y directo. No repitas datos que ya mencionaste.
Cuando uses herramientas, interpreta los resultados y da una respuesta útil y accionable.
Si detectas anomalías (tenants dormidos, conectores con error), propón acciones concretas.

FORMATO DE RESPUESTA:
- Usa **negrita** para números clave y métricas importantes.
- Usa tablas Markdown cuando presentes listas de tenants, errores o comparativas (columnas: Nombre | Estado | Última actividad).
- Usa listas con guión para enumerar acciones recomendadas.
- Usa encabezados ## solo si la respuesta tiene más de 3 secciones distintas.
- Mantén las respuestas bajo 300 palabras salvo que el usuario pida un análisis detallado.`;

export type ToolInput = Record<string, unknown>;

export type ToolName = 'get_activity_stats' | 'list_dormant_tenants' | 'get_connector_errors';

export const TOOLS = [
  {
    name: 'get_activity_stats' as ToolName,
    description:
      'Obtiene estadísticas de actividad de los conectores Holded: tenants activos en 7 y 30 días, queries hoy, tenants dormidos, y estado de conectores.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_dormant_tenants' as ToolName,
    description:
      'Lista los tenants con conector Holded conectado pero sin actividad en los últimos N días. Útil para detectar usuarios inactivos.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Número de días sin actividad para considerar dormido (por defecto 14)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_connector_errors' as ToolName,
    description: 'Lista los conectores en estado de error o revocado, con el tenant asociado.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

export async function runTool(name: string, input: ToolInput): Promise<string> {
  if (name === 'get_activity_stats') {
    const [activityRows, statusRows] = await Promise.all([
      query<{ active_30d: number; active_7d: number; queries_today: number; dormant: number }>(
        `SELECT
          COUNT(DISTINCT CASE WHEN al.created_at >= NOW() - INTERVAL '30 days' THEN ec.tenant_id END)::int AS active_30d,
          COUNT(DISTINCT CASE WHEN al.created_at >= NOW() - INTERVAL '7 days'  THEN ec.tenant_id END)::int AS active_7d,
          COUNT(*) FILTER (WHERE al.created_at >= NOW() - INTERVAL '24 hours')::int AS queries_today,
          (SELECT COUNT(DISTINCT ec2.tenant_id)::int
           FROM external_connections ec2
           WHERE ec2.provider = 'holded'
             AND ec2.connection_status = 'connected'
             AND ec2.tenant_id NOT IN (
               SELECT DISTINCT ec3.tenant_id
               FROM holded_mcp_pat_audit_logs al3
               JOIN holded_mcp_personal_access_tokens pat3 ON pat3.id = al3.pat_id
               JOIN external_connections ec3 ON ec3.id = pat3.connection_id
               WHERE al3.event = 'used'
                 AND al3.created_at >= NOW() - INTERVAL '30 days'
             )
          ) AS dormant
         FROM holded_mcp_pat_audit_logs al
         JOIN holded_mcp_personal_access_tokens pat ON pat.id = al.pat_id
         JOIN external_connections ec ON ec.id = pat.connection_id
         WHERE al.event = 'used'`,
        []
      ).catch(() => [{ active_30d: 0, active_7d: 0, queries_today: 0, dormant: 0 }]),
      query<{ status: string; count: number }>(
        `SELECT connection_status AS status, COUNT(*)::int AS count
         FROM external_connections WHERE provider = 'holded'
         GROUP BY connection_status`,
        []
      ).catch(() => [] as { status: string; count: number }[]),
    ]);

    const stats = activityRows[0] ?? { active_30d: 0, active_7d: 0, queries_today: 0, dormant: 0 };
    const statusMap = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
    const total = Object.values(statusMap).reduce((s, v) => s + (v as number), 0);

    return JSON.stringify({
      tenants_activos_7d: stats.active_7d,
      tenants_activos_30d: stats.active_30d,
      queries_hoy: stats.queries_today,
      tenants_dormidos_30d: stats.dormant,
      conectores: {
        total,
        conectados: statusMap.connected ?? 0,
        desconectados: statusMap.disconnected ?? 0,
        error: statusMap.error ?? 0,
        revocados: statusMap.revoked_api ?? 0,
      },
    });
  }

  if (name === 'list_dormant_tenants') {
    const days = typeof input.days === 'number' ? Math.max(1, Math.min(365, input.days)) : 14;
    const rows = await query<{
      tenant_id: string;
      tenant_name: string;
      last_activity: string | null;
      status: string;
    }>(
      `SELECT
        ec.tenant_id,
        COALESCE(tp.legal_name, tp.company_name, ec.tenant_id::text) AS tenant_name,
        MAX(al.created_at)::text AS last_activity,
        ec.connection_status AS status
       FROM external_connections ec
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = ec.tenant_id
       LEFT JOIN holded_mcp_personal_access_tokens pat ON pat.connection_id = ec.id
       LEFT JOIN holded_mcp_pat_audit_logs al ON al.pat_id = pat.id AND al.event = 'used'
       WHERE ec.provider = 'holded' AND ec.connection_status = 'connected'
       GROUP BY ec.tenant_id, tp.legal_name, tp.company_name, ec.connection_status
       HAVING MAX(al.created_at) IS NULL OR MAX(al.created_at) < NOW() - ($1 * INTERVAL '1 day')
       ORDER BY MAX(al.created_at) ASC NULLS FIRST
       LIMIT 20`,
      [days]
    ).catch(
      () =>
        [] as {
          tenant_id: string;
          tenant_name: string;
          last_activity: string | null;
          status: string;
        }[]
    );

    if (rows.length === 0) {
      return JSON.stringify({
        dormant: [],
        mensaje: `No hay tenants dormidos en los últimos ${days} días.`,
      });
    }
    return JSON.stringify({
      dias_sin_actividad: days,
      total: rows.length,
      dormant: rows.map((r) => ({
        tenant_id: r.tenant_id,
        nombre: r.tenant_name,
        ultima_actividad: r.last_activity ?? 'nunca',
      })),
    });
  }

  if (name === 'get_connector_errors') {
    const rows = await query<{
      id: string;
      tenant_id: string;
      tenant_name: string;
      status: string;
      updated_at: string;
    }>(
      `SELECT
        ec.id, ec.tenant_id,
        COALESCE(tp.legal_name, tp.company_name, ec.tenant_id::text) AS tenant_name,
        ec.connection_status AS status,
        ec.updated_at::text AS updated_at
       FROM external_connections ec
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = ec.tenant_id
       WHERE ec.provider = 'holded' AND ec.connection_status IN ('error', 'revoked_api')
       ORDER BY ec.updated_at DESC LIMIT 20`,
      []
    ).catch(
      () =>
        [] as {
          id: string;
          tenant_id: string;
          tenant_name: string;
          status: string;
          updated_at: string;
        }[]
    );

    if (rows.length === 0) {
      return JSON.stringify({ errores: [], mensaje: 'No hay conectores con error ni revocados.' });
    }
    return JSON.stringify({
      total: rows.length,
      errores: rows.map((r) => ({
        connection_id: r.id,
        tenant_id: r.tenant_id,
        nombre: r.tenant_name,
        estado: r.status,
        actualizado: r.updated_at,
      })),
    });
  }

  return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
}

// Anthropic wire types
export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: ToolInput };

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

export type AnthropicResponse = {
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
  content: AnthropicContentBlock[];
  error?: { message: string };
};
