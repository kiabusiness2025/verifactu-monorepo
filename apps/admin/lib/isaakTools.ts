/**
 * Herramientas y configuración compartidas del copiloto Isaak admin.
 * Usadas por /api/admin/isaak/chat y /api/admin/isaak/smoke.
 */

import { createDecipheriv, createHash } from 'crypto';
import { query } from '@/lib/db';
import prisma from '@/lib/prisma';
import { logCopilotAction } from '@/lib/isaakCopilotAudit';

export type RunToolContext = {
  adminEmail: string;
  adminUserId: string | null;
  tenantId?: string | null;
};

const HOLDED_API_BASE = 'https://api.holded.com';

// La API key de Holded se cifra en external_connections.api_key_enc con
// INTEGRATIONS_SECRET_KEY (o SESSION_SECRET) — igual que packages/integrations.
function decryptHoldedApiKey(enc: string): string {
  const raw =
    process.env.INTEGRATIONS_SECRET_KEY?.trim() ||
    process.env.INTEGRATION_SECRET_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    '';
  if (!raw) throw new Error('Missing INTEGRATIONS_SECRET_KEY / SESSION_SECRET');
  const key = createHash('sha256').update(raw).digest();
  const [ivPart, tagPart, payloadPart] = enc.split('.');
  if (!ivPart || !tagPart || !payloadPart) throw new Error('Invalid encrypted key format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadPart, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// Cubre todos los canales: dashboard (Isaak/widget), chatgpt, claude.
async function getTenantHoldedApiKey(tenantId: string): Promise<string | null> {
  const rows = await query<{ api_key_enc: string; channel_key: string }>(
    `SELECT api_key_enc, channel_key
     FROM external_connections
     WHERE tenant_id = $1
       AND provider = 'holded'
       AND connection_status = 'connected'
       AND api_key_enc IS NOT NULL
     ORDER BY
       CASE channel_key
         WHEN 'dashboard' THEN 0
         WHEN 'chatgpt'   THEN 1
         WHEN 'claude'    THEN 2
         ELSE 3
       END,
       connected_at DESC NULLS LAST
     LIMIT 1`,
    [tenantId]
  ).catch(() => [] as { api_key_enc: string; channel_key: string }[]);
  if (!rows.length || !rows[0].api_key_enc) return null;
  try {
    return decryptHoldedApiKey(rows[0].api_key_enc);
  } catch {
    return null;
  }
}

async function callHoldedApi(
  apiKey: string,
  path: string,
  params?: Record<string, string>
): Promise<unknown> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${HOLDED_API_BASE}${path}${qs}`, {
    headers: { key: apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Holded API ${res.status}: ${path}`);
  return res.json();
}

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
- Mantén las respuestas bajo 300 palabras salvo que el usuario pida un análisis detallado.

BLOQUES ESTRUCTURADOS (copia los JSON literalmente en bloques \`\`\`json):

1. Gráfico de actividad: cuando uses get_activity_timeline, copia el campo "chart_block" del resultado EXACTAMENTE en un bloque \`\`\`json después de tu análisis. No modifiques el JSON.

2. Exportación Excel: cuando presentes una lista de tenants o errores (más de 2 filas), añade al final un bloque \`\`\`json con este formato exacto:
{"type":"excel_export","filename":"nombre-archivo.xlsx","label":"Descargar Excel","headers":["Col1","Col2","Col3"],"rows":[["val1","val2","val3"]]}
Extrae headers y rows de los datos devueltos por la herramienta.

3. Asiento contable: cuando uses suggest_accounting_entry, copia el campo "excel_block" del resultado EXACTAMENTE en un bloque \`\`\`json, y presenta las líneas del asiento como tabla Markdown con columnas: Cuenta | Código PGC | Debe (€) | Haber (€).

4. Validación Verifactu: cuando uses validate_verifactu_invoice, informa claramente del resultado: ✅ si es válido, o lista en rojo los campos que faltan.

5. Datos Holded del tenant: cuando uses get_tenant_holded_data, presenta los datos como tablas Markdown. Si la operación devuelve facturas, muestra las columnas más relevantes (número, fecha, contacto, importe, estado). Si hay errores de API o clave no disponible, informa al administrador.

6. Análisis fiscal del tenant: cuando uses get_tenant_fiscal_analysis, presenta los resultados con estas secciones: tabla resumen IVA (Base imponible | IVA | Importe), resultado trimestral (cuota positiva = a ingresar, negativa = a devolver), y retenciones soportadas si las hay. Indica siempre que es una estimación basada en los datos disponibles en Holded.

7. Modelo 303 estimado: cuando uses get_tenant_modelo_303, presenta las casillas del formulario como tabla Markdown (Casilla | Descripción | Importe €), indica claramente que es una estimación y finaliza con el resultado (a ingresar o a devolver). Añade siempre la advertencia de que debe ser validado por el asesor fiscal antes de presentar.

8. Alertas de documentos pendientes: cuando uses get_tenant_unbooked_alerts, presenta primero el nivel de urgencia (🔴 URGENTE / 🟡 ATENCIÓN / 🟢 OK), después la tabla de facturas/compras pendientes con columnas (Número | Fecha | Contacto | Importe | Estado) y finalmente las acciones recomendadas.

9. Comparativa de períodos: cuando uses get_tenant_period_comparison, presenta una tabla con columnas (Concepto | Período actual | Período anterior | Variación €| Variación %) y resalta en negrita las variaciones superiores al 20%.

10. Vista general fiscal de tenants: cuando uses get_tenants_fiscal_overview, presenta los resultados como tabla Markdown (Nombre | Canales | API Key | Última actividad | Queries 30d). Resalta en **negrita** los tenants con queries_30d = 0 (dormidos). Si hay tenants con API key disponible, sugiere usar get_tenant_fiscal_analysis para los más relevantes.

PROTOCOLO DE CONFIRMACIÓN PARA ACCIONES (admin_*):

Las herramientas que empiezan por admin_* MODIFICAN datos (extender trial,
cambiar plan, cancelar suscripción, suplantar usuario). NUNCA las ejecutes
en el primer turno: tu obligación es PROPONER, no decidir.

Protocolo obligatorio:
1) Primero llama la herramienta SIN el parámetro \`confirm\` (o con confirm=false).
   La tool devolverá un objeto con \`preview\` describiendo qué pasaría.
2) Muestra el preview al admin con un resumen claro (tenant, plan actual,
   cambio propuesto, impacto en MRR si aplica) y pregunta literalmente
   "¿Confirmas?".
3) Solo si el admin responde afirmativamente ("sí", "confirma", "adelante",
   "hazlo"), vuelve a llamar la MISMA tool con \`confirm: true\`.
4) Tras ejecutar, muestra el resultado de la operación + el tenant/usuario
   afectado en una línea concisa.

Si el admin pide cancelar el plan, NO asumas el tenant: confirma el tenantId
exacto antes de simular. Si estamos en contexto de un tenant
(\`CONTEXTO ACTUAL: tenant X\`), usa ese por defecto pero CONFÍRMALO.`;

export type ToolInput = Record<string, unknown>;

export type ToolName =
  | 'get_activity_stats'
  | 'list_dormant_tenants'
  | 'get_connector_errors'
  | 'get_activity_timeline'
  | 'suggest_accounting_entry'
  | 'validate_verifactu_invoice'
  | 'get_tenant_holded_data'
  | 'get_tenant_fiscal_analysis'
  | 'get_tenant_unbooked_alerts'
  | 'get_tenant_period_comparison'
  | 'get_tenant_modelo_303'
  | 'get_tenants_fiscal_overview'
  // V3.1.a — Action tools operativas (con confirm flow)
  | 'admin_extend_trial'
  | 'admin_change_plan'
  | 'admin_cancel_subscription'
  | 'admin_impersonate_user'
  // V3.1.b — Action tools marketing/conectores (con confirm flow)
  | 'admin_send_custom_email'
  | 'admin_send_marketing_campaign'
  | 'admin_revoke_connector'
  // V3.2 — Search & Analytics (read-only)
  | 'search_global'
  | 'find_tenant_by_nif'
  | 'top_tenants_by_mrr'
  | 'subscriptions_ending_soon'
  | 'get_churn_30d'
  | 'get_marketing_funnel';

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
  {
    name: 'get_activity_timeline' as ToolName,
    description:
      'Devuelve la actividad diaria (queries y tenants únicos) de los últimos N días. Usa esta herramienta cuando el usuario pida una gráfica, tendencia o evolución de la actividad. Devuelve un chart_block listo para renderizar.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Número de días a consultar (por defecto 30, máximo 90)',
        },
      },
      required: [],
    },
  },
  {
    name: 'suggest_accounting_entry' as ToolName,
    description:
      'Genera el asiento contable (Plan General Contable español) para una factura o ticket de compra/venta. Usa esta herramienta cuando el usuario pida un asiento, apunte contable o registro en el libro diario. Devuelve las líneas debe/haber y un excel_block para descargar.',
    input_schema: {
      type: 'object',
      properties: {
        concepto: { type: 'string', description: 'Descripción del gasto o ingreso' },
        importe_total: { type: 'number', description: 'Importe total (con IVA)' },
        base_imponible: { type: 'number', description: 'Base imponible (sin IVA)' },
        tipo_iva: { type: 'number', description: 'Tipo IVA en % (21, 10, 4 o 0)' },
        tipo: {
          type: 'string',
          enum: ['gasto', 'ingreso'],
          description: 'Si es un gasto (compra) o ingreso (venta)',
        },
        proveedor: { type: 'string', description: 'Nombre del proveedor o cliente' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        cuenta_gasto: {
          type: 'string',
          description:
            'Código de cuenta PGC para el gasto (600 compras, 621 reparaciones, 622 profesionales, 625 publicidad, 628 suministros, 629 otros). Por defecto 600.',
        },
      },
      required: ['importe_total', 'tipo'],
    },
  },
  {
    name: 'validate_verifactu_invoice' as ToolName,
    description:
      'Valida que una factura contiene los campos obligatorios según la normativa Verifactu (España). Usa esta herramienta cuando el usuario quiera comprobar si una factura es válida para emitir.',
    input_schema: {
      type: 'object',
      properties: {
        nif_emisor: { type: 'string', description: 'NIF/CIF del emisor' },
        nombre_emisor: { type: 'string', description: 'Nombre o razón social del emisor' },
        numero_factura: { type: 'string', description: 'Número de factura' },
        fecha_expedicion: { type: 'string', description: 'Fecha de expedición (YYYY-MM-DD)' },
        descripcion: { type: 'string', description: 'Descripción de la operación' },
        base_imponible: { type: 'number', description: 'Base imponible en euros' },
        tipo_iva: { type: 'number', description: 'Tipo IVA en %' },
        cuota_iva: { type: 'number', description: 'Cuota IVA en euros' },
        total: { type: 'number', description: 'Importe total en euros' },
        nif_receptor: { type: 'string', description: 'NIF del receptor (requerido en B2B)' },
      },
      required: [],
    },
  },
  {
    name: 'get_tenant_modelo_303' as ToolName,
    description:
      'Genera un resumen estimado del Modelo 303 (declaración trimestral de IVA, España) para un tenant a partir de sus facturas y compras en Holded. Desglosa IVA repercutido por tipo (21%, 10%, 4%), calcula el IVA soportado deducible y el resultado (a ingresar o a devolver). Usa esta herramienta cuando el administrador pregunte por el modelo 303, la declaración de IVA, cuánto tiene que pagar en el trimestre o el resumen fiscal trimestral.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        year: { type: 'number', description: 'Año fiscal (por defecto el año en curso)' },
        trimestre: {
          type: 'number',
          description:
            'Trimestre: 1 (ene-mar), 2 (abr-jun), 3 (jul-sep), 4 (oct-dic). Por defecto el trimestre actual.',
        },
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'get_tenant_unbooked_alerts' as ToolName,
    description:
      'Detecta documentos pendientes o vencidos de un tenant en Holded: facturas de venta sin cobrar, compras sin pagar y documentos vencidos. Usa esta herramienta cuando el administrador pregunte por facturas sin contabilizar, documentos pendientes, alertas fiscales o situación de cobros/pagos de un tenant.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        days_overdue: {
          type: 'number',
          description: 'Días de antigüedad para considerar un documento urgente (por defecto 30)',
        },
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'get_tenant_period_comparison' as ToolName,
    description:
      'Compara ingresos, gastos e IVA de un tenant entre el período actual y el anterior. Tipo "mensual" compara este mes vs el mes pasado. Tipo "anual" compara el año en curso (YTD) vs el mismo período del año anterior. Usa esta herramienta cuando el administrador pida comparativas, tendencias, si el negocio va mejor o peor, o evolución de ingresos/gastos.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        tipo: {
          type: 'string',
          enum: ['mensual', 'anual'],
          description: 'mensual: este mes vs mes anterior. anual: YTD actual vs YTD año anterior.',
        },
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'get_tenant_fiscal_analysis' as ToolName,
    description:
      'Analiza la situación fiscal trimestral de un tenant: IVA repercutido (ventas), IVA soportado (compras), cuota IVA estimada a pagar o devolver, y retenciones soportadas. Usa esta herramienta cuando el administrador pida el IVA del trimestre, situación fiscal, modelo 303 estimado, o análisis de retenciones de un tenant concreto.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        year: {
          type: 'number',
          description: 'Año fiscal (por defecto el año en curso)',
        },
        trimestre: {
          type: 'number',
          description:
            'Trimestre: 1 (ene-mar), 2 (abr-jun), 3 (jul-sep), 4 (oct-dic). Por defecto el trimestre actual.',
        },
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'get_tenant_holded_data' as ToolName,
    description:
      'Consulta datos reales de Holded de un tenant específico usando su API key almacenada. Usa esta herramienta cuando el administrador pregunte por facturas, compras, contactos o el estado contable de un tenant concreto. Requiere que el tenant haya conectado su cuenta Holded vía OAuth (canal ChatGPT o Claude).',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: {
          type: 'string',
          description: 'UUID del tenant del que se quieren consultar datos',
        },
        operacion: {
          type: 'string',
          enum: ['resumen', 'facturas_recientes', 'compras_recientes', 'contactos'],
          description:
            'Operación a realizar: resumen (facturas + compras + contactos resumidos), facturas_recientes (últimas 25 facturas de venta), compras_recientes (últimas 25 compras/gastos), contactos (lista de contactos)',
        },
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'get_tenants_fiscal_overview' as ToolName,
    description:
      'Lista todos los tenants con Holded conectado mostrando sus canales activos, si tienen API key almacenada, fecha de última actividad y queries en los últimos 30 días. Usa esta herramienta cuando el administrador pregunte qué tenants necesitan atención fiscal, cuáles tienen Holded activo con API key, o quiera priorizar un análisis masivo de IVA o Modelo 303.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Máximo de tenants a listar (por defecto 20, máximo 50)',
        },
        only_active: {
          type: 'boolean',
          description: 'Si true, solo tenants con actividad en los últimos 30 días',
        },
      },
      required: [],
    },
  },
  // ── V3.1.a — Action tools (con confirm flow) ─────────────────────────────
  {
    name: 'admin_extend_trial' as ToolName,
    description:
      'Extiende el período de trial de un tenant N días. Solo aplica a suscripciones en estado trial o active. NO ejecutes sin confirm=true: primero llama sin confirm para obtener el preview, pregunta al admin, y solo entonces vuelve con confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        days: { type: 'number', description: 'Días a extender (1-90)' },
        confirm: { type: 'boolean', description: 'true para ejecutar; false/omitir para preview' },
      },
      required: ['tenant_id', 'days'],
    },
  },
  {
    name: 'admin_change_plan' as ToolName,
    description:
      'Cambia el plan activo de la suscripción de un tenant. Recibe el planId numérico (consultable en /subscriptions/stripe). NO ejecutes sin confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        plan_id: { type: 'number', description: 'ID numérico del Plan destino' },
        confirm: { type: 'boolean', description: 'true para ejecutar; false/omitir para preview' },
      },
      required: ['tenant_id', 'plan_id'],
    },
  },
  {
    name: 'admin_cancel_subscription' as ToolName,
    description:
      'Cancela la suscripción activa de un tenant marcándola para cancelación al final del período actual (cancel_at_period_end=true). El tenant sigue activo hasta currentPeriodEnd. NO ejecutes sin confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'UUID del tenant' },
        confirm: { type: 'boolean', description: 'true para ejecutar; false/omitir para preview' },
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'admin_impersonate_user' as ToolName,
    description:
      'Genera un enlace de suplantación: al abrirlo, el admin abre la app del usuario como si fuera él (para soporte). Auditado. NO ejecutes sin confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'UUID del usuario a suplantar' },
        reason: {
          type: 'string',
          description: 'Motivo breve de la suplantación (para audit log)',
        },
        confirm: { type: 'boolean', description: 'true para ejecutar; false/omitir para preview' },
      },
      required: ['user_id'],
    },
  },
  // ── V3.1.b — Acciones marketing / conectores ─────────────────────────────
  {
    name: 'admin_send_custom_email' as ToolName,
    description:
      'Envía un email personalizado (Resend) a UN usuario concreto, identificado por user_id o email. Usar para soporte 1:1, recordatorios o avisos. NO usar para campañas masivas (usa admin_send_marketing_campaign). NO ejecutes sin confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'UUID del usuario (preferido)' },
        email: { type: 'string', description: 'Email destino si no hay user_id' },
        subject: { type: 'string', description: 'Asunto del email' },
        body: {
          type: 'string',
          description: 'Cuerpo en texto plano (se renderiza en HTML simple)',
        },
        confirm: { type: 'boolean', description: 'true para enviar; false/omitir para preview' },
      },
      required: ['subject', 'body'],
    },
  },
  {
    name: 'admin_send_marketing_campaign' as ToolName,
    description:
      'Envía una campaña de email a un SEGMENTO de usuarios. Acción potencialmente masiva (cientos/miles). En modo preview devuelve el número exacto de destinatarios; el admin debe confirmar explícitamente. Persiste como MarketingCampaign para historial. NO ejecutes sin confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        segment: {
          type: 'string',
          enum: ['all_users', 'holded_connected', 'holded_error'],
          description:
            'Segmento destino: todos los usuarios | usuarios con Holded conectada | usuarios con Holded en error',
        },
        subject: { type: 'string', description: 'Asunto del email' },
        body: { type: 'string', description: 'Cuerpo en texto plano (renderizado HTML simple)' },
        confirm: {
          type: 'boolean',
          description: 'true para enviar; false/omitir para preview con count',
        },
      },
      required: ['segment', 'subject', 'body'],
    },
  },
  {
    name: 'admin_revoke_connector' as ToolName,
    description:
      'Revoca por completo una ExternalConnection Holded: marca status=revoked_api y borra la API key cifrada. El tenant tendrá que reconectarse. Reversible: el admin puede llamar después al endpoint reactivate. NO ejecutes sin confirm=true.',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: { type: 'string', description: 'UUID de la ExternalConnection' },
        reason: { type: 'string', description: 'Motivo breve (para audit log)' },
        confirm: { type: 'boolean', description: 'true para revocar; false/omitir para preview' },
      },
      required: ['connection_id'],
    },
  },
  // ── V3.2 — Search & Analytics (read-only) ────────────────────────────────
  {
    name: 'search_global' as ToolName,
    description:
      'Búsqueda transversal por nombre/email/NIF/dominio. Devuelve hasta 10 hits agrupados por tipo: usuarios, tenants, conversaciones (titulo). Útil cuando el admin no recuerda exactamente dónde buscar.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto a buscar (mín 2 chars)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_tenant_by_nif' as ToolName,
    description:
      'Busca un tenant por NIF exacto y devuelve su perfil + suscripción + estado Holded. Usa esto cuando el admin pregunte por una empresa concreta y mencione un NIF.',
    input_schema: {
      type: 'object',
      properties: {
        nif: { type: 'string', description: 'NIF o CIF (con/sin letras al principio)' },
      },
      required: ['nif'],
    },
  },
  {
    name: 'top_tenants_by_mrr' as ToolName,
    description:
      'Top N tenants por MRR (Monthly Recurring Revenue) de su suscripción activa. Por defecto top 10.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Número de resultados (1-50, default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'subscriptions_ending_soon' as ToolName,
    description:
      'Lista suscripciones cuyo trial o período acaba en los próximos N días. Útil para detectar churn potencial o trials por convertir. Por defecto 7 días.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Ventana en días (1-60, default 7)' },
      },
      required: [],
    },
  },
  {
    name: 'get_churn_30d' as ToolName,
    description:
      'Análisis de churn en los últimos 30 días: cancelaciones (status cancelled o cancel_at_period_end=true), MRR perdido, lista de tenants afectados.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_marketing_funnel' as ToolName,
    description:
      'Funnel de adquisición: leads (UsageEvent.LEAD_CREATED) → demos (DemoRequest) → trials activas → conversiones a plan pago. Periodo configurable en días (default 30).',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Días hacia atrás (1-365, default 30)' },
      },
      required: [],
    },
  },
];

export async function runTool(
  name: string,
  input: ToolInput,
  context?: RunToolContext
): Promise<string> {
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

  if (name === 'get_activity_timeline') {
    const days = typeof input.days === 'number' ? Math.max(1, Math.min(90, input.days)) : 30;
    const rows = await query<{ date: string; queries: number; tenants: number }>(
      `SELECT
        DATE(al.created_at)::text AS date,
        COUNT(*)::int AS queries,
        COUNT(DISTINCT ec.tenant_id)::int AS tenants
       FROM holded_mcp_pat_audit_logs al
       JOIN holded_mcp_personal_access_tokens pat ON pat.id = al.pat_id
       JOIN external_connections ec ON ec.id = pat.connection_id
       WHERE al.event = 'used'
         AND al.created_at >= NOW() - ($1 * INTERVAL '1 day')
       GROUP BY DATE(al.created_at)
       ORDER BY DATE(al.created_at) ASC`,
      [days]
    ).catch(() => [] as { date: string; queries: number; tenants: number }[]);

    const chartBlock = {
      type: 'chart',
      chartType: 'bar',
      title: `Actividad diaria — últimos ${days} días`,
      xKey: 'date',
      series: [
        { key: 'queries', label: 'Queries', color: '#2361d8' },
        { key: 'tenants', label: 'Tenants activos', color: '#10b981' },
      ],
      data: rows,
    };

    return JSON.stringify({
      dias: days,
      total_queries: rows.reduce((s, r) => s + r.queries, 0),
      pico_diario: rows.length > 0 ? Math.max(...rows.map((r) => r.queries)) : 0,
      chart_block: chartBlock,
    });
  }

  if (name === 'suggest_accounting_entry') {
    const total = Number(input.importe_total) || 0;
    const tipoIva = typeof input.tipo_iva === 'number' ? input.tipo_iva : 21;
    const base =
      typeof input.base_imponible === 'number'
        ? input.base_imponible
        : parseFloat((total / (1 + tipoIva / 100)).toFixed(2));
    const cuotaIva = parseFloat((total - base).toFixed(2));
    const tipo = String(input.tipo ?? 'gasto') === 'ingreso' ? 'ingreso' : 'gasto';
    const concepto = String(input.concepto ?? 'Sin descripción');
    const proveedor = String(input.proveedor ?? (tipo === 'gasto' ? 'Proveedor' : 'Cliente'));
    const fecha = String(input.fecha ?? new Date().toISOString().slice(0, 10));
    const cuentaGasto = String(input.cuenta_gasto ?? '600');

    type AsientoLine = [string, string, string, string, string];
    let lineas: AsientoLine[];

    if (tipo === 'gasto') {
      lineas = [[concepto, cuentaGasto, base.toFixed(2), '', concepto]];
      if (tipoIva > 0) {
        lineas.push([`H.P. IVA soportado (${tipoIva}%)`, '472', cuotaIva.toFixed(2), '', concepto]);
      }
      lineas.push([proveedor, '400', '', total.toFixed(2), concepto]);
    } else {
      lineas = [[proveedor, '430', total.toFixed(2), '', concepto]];
      if (tipoIva > 0) {
        lineas.push([
          `H.P. IVA repercutido (${tipoIva}%)`,
          '477',
          '',
          cuotaIva.toFixed(2),
          concepto,
        ]);
      }
      lineas.push([concepto, '700', '', base.toFixed(2), concepto]);
    }

    return JSON.stringify({
      fecha,
      concepto,
      total: total.toFixed(2),
      base: base.toFixed(2),
      iva: cuotaIva.toFixed(2),
      lineas: lineas.map(([cuenta, codigo, debe, haber]) => ({ cuenta, codigo, debe, haber })),
      excel_block: {
        type: 'excel_export',
        filename: `asiento-${fecha}.xlsx`,
        label: 'Descargar asiento Excel',
        headers: ['Cuenta', 'Código PGC', 'Debe (€)', 'Haber (€)', 'Concepto'],
        rows: lineas,
      },
    });
  }

  if (name === 'validate_verifactu_invoice') {
    const requiredFields: { key: string; label: string }[] = [
      { key: 'nif_emisor', label: 'NIF del emisor' },
      { key: 'nombre_emisor', label: 'Nombre/razón social del emisor' },
      { key: 'numero_factura', label: 'Número de factura' },
      { key: 'fecha_expedicion', label: 'Fecha de expedición' },
      { key: 'descripcion', label: 'Descripción de la operación' },
      { key: 'base_imponible', label: 'Base imponible' },
      { key: 'tipo_iva', label: 'Tipo de IVA' },
      { key: 'cuota_iva', label: 'Cuota de IVA' },
      { key: 'total', label: 'Importe total' },
    ];

    const faltantes = requiredFields
      .filter((f) => input[f.key] === undefined || input[f.key] === null || input[f.key] === '')
      .map((f) => f.label);

    const esB2b = !!input.nif_receptor;
    const valido = faltantes.length === 0;

    return JSON.stringify({
      valido,
      campos_faltantes: faltantes,
      es_b2b: esB2b,
      mensaje: valido
        ? '✅ La factura cumple los campos mínimos obligatorios de Verifactu.'
        : `❌ Faltan ${faltantes.length} campo(s) obligatorio(s) para Verifactu.`,
      nota: !esB2b
        ? 'Sin NIF receptor: se tratará como factura B2C (simplificada). En operaciones B2B el NIF receptor es obligatorio.'
        : undefined,
    });
  }

  if (name === 'get_tenant_modelo_303') {
    const tenantId = String(input.tenant_id ?? '');
    if (!tenantId) return JSON.stringify({ error: 'tenant_id es obligatorio' });

    const now = new Date();
    const year = typeof input.year === 'number' ? input.year : now.getUTCFullYear();
    const currentQ = Math.floor(now.getUTCMonth() / 3) + 1;
    const trimestre =
      typeof input.trimestre === 'number' && [1, 2, 3, 4].includes(input.trimestre)
        ? input.trimestre
        : currentQ;

    const qStart = new Date(Date.UTC(year, (trimestre - 1) * 3, 1));
    const qEnd = new Date(Date.UTC(year, trimestre * 3, 0, 23, 59, 59));
    const qStartTs = Math.floor(qStart.getTime() / 1000);
    const qEndTs = Math.floor(qEnd.getTime() / 1000);

    const apiKey = await getTenantHoldedApiKey(tenantId);
    if (!apiKey) {
      return JSON.stringify({
        error: 'No hay API key válida para este tenant.',
        tenant_id: tenantId,
      });
    }

    type HoldedDoc = {
      date?: number;
      total?: number;
      subtotal?: number;
      tax?: number;
      retention?: number;
    };

    const fetchQuarterDocs = async (docType: string): Promise<HoldedDoc[]> => {
      const results: HoldedDoc[] = [];
      for (let page = 1; page <= 4; page++) {
        const batch = (await callHoldedApi(apiKey!, `/api/invoicing/v1/documents/${docType}`, {
          page: String(page),
        }).catch(() => [])) as HoldedDoc[];
        if (!Array.isArray(batch) || batch.length === 0) break;
        results.push(
          ...batch.filter(
            (d) => typeof d.date === 'number' && d.date >= qStartTs && d.date <= qEndTs
          )
        );
        if (batch.length < 15) break;
      }
      return results;
    };

    // Snap effective rate to nearest standard Spanish IVA bracket
    const snapToStandardRate = (effectivePct: number): 0 | 4 | 10 | 21 => {
      if (effectivePct <= 1) return 0;
      if (effectivePct <= 7) return 4;
      if (effectivePct <= 15.5) return 10;
      return 21;
    };

    const detectRate = (d: HoldedDoc): 0 | 4 | 10 | 21 => {
      const total = d.total ?? 0;
      if (total <= 0) return 0;
      const subtotal = typeof d.subtotal === 'number' && d.subtotal > 0 ? d.subtotal : null;
      const tax = typeof d.tax === 'number' ? d.tax : null;

      if (subtotal !== null && subtotal > 0) {
        const effectivePct = ((total - subtotal) / subtotal) * 100;
        return snapToStandardRate(effectivePct);
      }
      if (tax !== null && tax > 0) {
        const base = total - tax;
        if (base > 0) return snapToStandardRate((tax / base) * 100);
      }
      // No tax info: assume 21% (general)
      return 21;
    };

    const baseFromDoc = (d: HoldedDoc): number => {
      const total = d.total ?? 0;
      if (typeof d.subtotal === 'number' && d.subtotal > 0) return d.subtotal;
      const rate = detectRate(d);
      if (rate === 0) return total;
      return parseFloat((total / (1 + rate / 100)).toFixed(2));
    };

    try {
      const [invoices, purchases] = await Promise.all([
        fetchQuarterDocs('invoice'),
        fetchQuarterDocs('purchase'),
      ]);

      // IVA repercutido: desglose por tipo
      const repercutido = {
        base21: 0,
        cuota21: 0,
        base10: 0,
        cuota10: 0,
        base4: 0,
        cuota4: 0,
        base0: 0,
      };
      let retenciones = 0;

      for (const d of invoices) {
        const rate = detectRate(d);
        const base = baseFromDoc(d);
        const cuota = parseFloat(((d.total ?? 0) - base).toFixed(2));
        if (rate === 21) {
          repercutido.base21 += base;
          repercutido.cuota21 += cuota;
        } else if (rate === 10) {
          repercutido.base10 += base;
          repercutido.cuota10 += cuota;
        } else if (rate === 4) {
          repercutido.base4 += base;
          repercutido.cuota4 += cuota;
        } else {
          repercutido.base0 += base;
        }
      }

      // IVA soportado: suma total (compras)
      let baseSoportado = 0;
      let cuotaSoportada = 0;
      for (const d of purchases) {
        const base = baseFromDoc(d);
        const cuota = parseFloat(((d.total ?? 0) - base).toFixed(2));
        baseSoportado += base;
        cuotaSoportada += cuota;
        if (typeof d.retention === 'number' && d.retention > 0) retenciones += d.retention;
      }

      const r = repercutido;
      const totalRepercutido = parseFloat((r.cuota21 + r.cuota10 + r.cuota4).toFixed(2));
      const totalSoportado = parseFloat(cuotaSoportada.toFixed(2));
      const casilla47 = parseFloat((totalRepercutido - totalSoportado).toFixed(2));
      const resultado = casilla47; // simplified (no compensaciones previas)

      const qLabel = `T${trimestre}/${year}`;
      const periodoDesc = [
        '',
        'enero-marzo',
        'abril-junio',
        'julio-septiembre',
        'octubre-diciembre',
      ][trimestre];

      // 303 casillas structure
      type Casilla = { num: string; descripcion: string; base: number | null; cuota: number };
      const casillas: Casilla[] = [
        {
          num: '01',
          descripcion: 'Base imponible — Tipo general 21%',
          base: parseFloat(r.base21.toFixed(2)),
          cuota: parseFloat(r.cuota21.toFixed(2)),
        },
        {
          num: '02',
          descripcion: 'Cuota devengada — Tipo general 21%',
          base: null,
          cuota: parseFloat(r.cuota21.toFixed(2)),
        },
        {
          num: '03',
          descripcion: 'Base imponible — Tipo reducido 10%',
          base: parseFloat(r.base10.toFixed(2)),
          cuota: parseFloat(r.cuota10.toFixed(2)),
        },
        {
          num: '04',
          descripcion: 'Cuota devengada — Tipo reducido 10%',
          base: null,
          cuota: parseFloat(r.cuota10.toFixed(2)),
        },
        {
          num: '05',
          descripcion: 'Base imponible — Tipo superreducido 4%',
          base: parseFloat(r.base4.toFixed(2)),
          cuota: parseFloat(r.cuota4.toFixed(2)),
        },
        {
          num: '06',
          descripcion: 'Cuota devengada — Tipo superreducido 4%',
          base: null,
          cuota: parseFloat(r.cuota4.toFixed(2)),
        },
        {
          num: '07',
          descripcion: 'Total cuota devengada (IVA repercutido)',
          base: null,
          cuota: totalRepercutido,
        },
        {
          num: '28',
          descripcion: 'Base imponible deducible (compras)',
          base: parseFloat(baseSoportado.toFixed(2)),
          cuota: totalSoportado,
        },
        {
          num: '29',
          descripcion: 'Cuota IVA soportado deducible',
          base: null,
          cuota: totalSoportado,
        },
        { num: '46', descripcion: 'Total IVA deducible', base: null, cuota: totalSoportado },
        { num: '47', descripcion: 'Diferencia (casilla 07 − 46)', base: null, cuota: casilla47 },
        {
          num: '70',
          descripcion: resultado >= 0 ? 'Resultado — A INGRESAR' : 'Resultado — A DEVOLVER',
          base: null,
          cuota: Math.abs(resultado),
        },
      ];

      return JSON.stringify({
        tenant_id: tenantId,
        modelo: '303',
        periodo: qLabel,
        trimestre,
        year,
        periodo_descripcion: periodoDesc,
        documentos_analizados: { ventas: invoices.length, compras: purchases.length },
        casillas,
        resultado: {
          importe: resultado,
          estado: resultado >= 0 ? 'a_ingresar' : 'a_devolver',
          descripcion:
            resultado >= 0
              ? `A ingresar en Hacienda: ${resultado.toFixed(2)} €`
              : `A devolver por Hacienda: ${Math.abs(resultado).toFixed(2)} €`,
        },
        retenciones_soportadas:
          retenciones > 0
            ? {
                total: parseFloat(retenciones.toFixed(2)),
                nota: 'Retenciones detectadas en compras (servicios profesionales). No forman parte del Mod. 303 pero se declaran en Mod. 115/190.',
              }
            : null,
        aviso:
          'Estimación automática basada en los datos de Holded. Puede haber facturas fuera de la primera página o con tipos de IVA no detectados. Valida con tu asesor antes de presentar.',
        excel_block: {
          type: 'excel_export',
          filename: `modelo-303-${qLabel.toLowerCase().replace('/', '-')}-${tenantId.slice(0, 8)}.xlsx`,
          label: 'Descargar Modelo 303 estimado (Excel)',
          headers: ['Casilla', 'Descripción', 'Base imponible (€)', 'Cuota (€)'],
          rows: casillas.map((c) => [
            c.num,
            c.descripcion,
            c.base !== null ? c.base.toFixed(2) : '—',
            c.cuota.toFixed(2),
          ]),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: `Error generando Modelo 303: ${msg}`, tenant_id: tenantId });
    }
  }

  if (name === 'get_tenant_unbooked_alerts') {
    const tenantId = String(input.tenant_id ?? '');
    if (!tenantId) return JSON.stringify({ error: 'tenant_id es obligatorio' });

    const daysOverdue =
      typeof input.days_overdue === 'number' ? Math.max(1, input.days_overdue) : 30;

    const apiKey = await getTenantHoldedApiKey(tenantId);
    if (!apiKey) {
      return JSON.stringify({
        error: 'No hay API key válida para este tenant.',
        tenant_id: tenantId,
      });
    }

    type HoldedDoc = {
      id?: string;
      docNumber?: string;
      date?: number;
      dueDate?: number;
      total?: number;
      contactName?: string;
      paid?: boolean;
      status?: number;
    };

    try {
      const [invoices, purchases] = await Promise.all([
        callHoldedApi(apiKey, '/api/invoicing/v1/documents/invoice', { page: '1' }).catch(
          () => []
        ) as Promise<HoldedDoc[]>,
        callHoldedApi(apiKey, '/api/invoicing/v1/documents/purchase', { page: '1' }).catch(
          () => []
        ) as Promise<HoldedDoc[]>,
      ]);

      const now = Date.now() / 1000;
      const cutoffTs = now - daysOverdue * 86400;

      const classifyDoc = (d: HoldedDoc): 'overdue' | 'pending' | null => {
        if (d.paid) return null;
        if (d.status === 0) return null; // draft
        if (d.status === 2) return 'overdue';
        if (d.status === 1 && typeof d.date === 'number' && d.date < cutoffTs) return 'overdue';
        if (d.status === 1) return 'pending';
        return null;
      };

      type AlertDoc = {
        numero: string | null;
        fecha: string | null;
        contacto: string | null;
        total_eur: number;
        estado: string;
        urgente: boolean;
      };

      const pendingInvoices: AlertDoc[] = [];
      const pendingPurchases: AlertDoc[] = [];

      for (const d of Array.isArray(invoices) ? invoices : []) {
        const cls = classifyDoc(d);
        if (!cls) continue;
        pendingInvoices.push({
          numero: d.docNumber ?? null,
          fecha: d.date ? new Date(d.date * 1000).toISOString().slice(0, 10) : null,
          contacto: d.contactName ?? null,
          total_eur: d.total ?? 0,
          estado: cls === 'overdue' ? 'vencida' : 'pendiente',
          urgente: cls === 'overdue',
        });
      }

      for (const d of Array.isArray(purchases) ? purchases : []) {
        const cls = classifyDoc(d);
        if (!cls) continue;
        pendingPurchases.push({
          numero: d.docNumber ?? null,
          fecha: d.date ? new Date(d.date * 1000).toISOString().slice(0, 10) : null,
          contacto: d.contactName ?? null,
          total_eur: d.total ?? 0,
          estado: cls === 'overdue' ? 'vencida' : 'pendiente',
          urgente: cls === 'overdue',
        });
      }

      const urgentInvoices = pendingInvoices.filter((d) => d.urgente).length;
      const urgentPurchases = pendingPurchases.filter((d) => d.urgente).length;
      const totalPending = pendingInvoices.length + pendingPurchases.length;

      let urgencyLevel: 'URGENTE' | 'ATENCIÓN' | 'OK';
      if (urgentInvoices > 0 || urgentPurchases > 0) urgencyLevel = 'URGENTE';
      else if (totalPending > 0) urgencyLevel = 'ATENCIÓN';
      else urgencyLevel = 'OK';

      const totalPendingInvoicesEur = pendingInvoices.reduce((s, d) => s + d.total_eur, 0);
      const totalPendingPurchasesEur = pendingPurchases.reduce((s, d) => s + d.total_eur, 0);

      return JSON.stringify({
        tenant_id: tenantId,
        urgencia: urgencyLevel,
        resumen: {
          facturas_pendientes: pendingInvoices.length,
          facturas_vencidas: urgentInvoices,
          total_por_cobrar_eur: parseFloat(totalPendingInvoicesEur.toFixed(2)),
          compras_pendientes: pendingPurchases.length,
          compras_vencidas: urgentPurchases,
          total_por_pagar_eur: parseFloat(totalPendingPurchasesEur.toFixed(2)),
        },
        facturas_pendientes: pendingInvoices.slice(0, 15),
        compras_pendientes: pendingPurchases.slice(0, 15),
        acciones_recomendadas:
          urgencyLevel === 'OK'
            ? ['No hay documentos pendientes urgentes.']
            : [
                urgentInvoices > 0
                  ? `Revisar ${urgentInvoices} factura(s) de venta vencida(s) con ${totalPendingInvoicesEur.toFixed(0)} € sin cobrar.`
                  : null,
                urgentPurchases > 0
                  ? `Atender ${urgentPurchases} compra(s) vencida(s) con ${totalPendingPurchasesEur.toFixed(0)} € sin pagar.`
                  : null,
                pendingInvoices.length > urgentInvoices
                  ? `${pendingInvoices.length - urgentInvoices} factura(s) de venta pendiente(s) (aún no vencidas).`
                  : null,
              ].filter(Boolean),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: `Error consultando Holded: ${msg}`, tenant_id: tenantId });
    }
  }

  if (name === 'get_tenant_period_comparison') {
    const tenantId = String(input.tenant_id ?? '');
    if (!tenantId) return JSON.stringify({ error: 'tenant_id es obligatorio' });

    const tipo = String(input.tipo ?? 'mensual') === 'anual' ? 'anual' : 'mensual';

    const apiKey = await getTenantHoldedApiKey(tenantId);
    if (!apiKey) {
      return JSON.stringify({
        error: 'No hay API key válida para este tenant.',
        tenant_id: tenantId,
      });
    }

    const now = new Date();
    let curStart: Date,
      curEnd: Date,
      prevStart: Date,
      prevEnd: Date,
      curLabel: string,
      prevLabel: string;

    if (tipo === 'mensual') {
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      curStart = new Date(Date.UTC(y, m, 1));
      curEnd = now;
      prevStart = new Date(Date.UTC(y, m - 1, 1));
      prevEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59));
      const months = [
        'ene',
        'feb',
        'mar',
        'abr',
        'may',
        'jun',
        'jul',
        'ago',
        'sep',
        'oct',
        'nov',
        'dic',
      ];
      curLabel = `${months[m]} ${y}`;
      prevLabel = `${months[(m + 11) % 12]} ${m === 0 ? y - 1 : y}`;
    } else {
      const y = now.getUTCFullYear();
      const dayOfYear = Math.floor((now.getTime() - Date.UTC(y, 0, 1)) / 86400000);
      curStart = new Date(Date.UTC(y, 0, 1));
      curEnd = now;
      prevStart = new Date(Date.UTC(y - 1, 0, 1));
      prevEnd = new Date(Date.UTC(y - 1, 0, 1 + dayOfYear, 23, 59, 59));
      curLabel = `YTD ${y}`;
      prevLabel = `YTD ${y - 1}`;
    }

    const toTs = (d: Date) => Math.floor(d.getTime() / 1000);
    const curStartTs = toTs(curStart);
    const curEndTs = toTs(curEnd);
    const prevStartTs = toTs(prevStart);
    const prevEndTs = toTs(prevEnd);

    type HoldedDoc = { date?: number; total?: number; subtotal?: number; tax?: number };

    const fetchFiltered = async (
      docType: string,
      startTs: number,
      endTs: number
    ): Promise<HoldedDoc[]> => {
      const all: HoldedDoc[] = [];
      for (let page = 1; page <= 3; page++) {
        const batch = (await callHoldedApi(apiKey!, `/api/invoicing/v1/documents/${docType}`, {
          page: String(page),
        }).catch(() => [])) as HoldedDoc[];
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(
          ...batch.filter((d) => typeof d.date === 'number' && d.date >= startTs && d.date <= endTs)
        );
        if (batch.length < 15) break;
      }
      return all;
    };

    try {
      const [curInv, curPur, prevInv, prevPur] = await Promise.all([
        fetchFiltered('invoice', curStartTs, curEndTs),
        fetchFiltered('purchase', curStartTs, curEndTs),
        fetchFiltered('invoice', prevStartTs, prevEndTs),
        fetchFiltered('purchase', prevStartTs, prevEndTs),
      ]);

      const sumPeriod = (inv: HoldedDoc[], pur: HoldedDoc[]) => {
        const ingresos = inv.reduce((s, d) => s + (d.total ?? 0), 0);
        const gastos = pur.reduce((s, d) => s + (d.total ?? 0), 0);
        const baseIngresos = inv.reduce((s, d) => s + (d.subtotal ?? d.total ?? 0), 0);
        const basePur = pur.reduce((s, d) => s + (d.subtotal ?? d.total ?? 0), 0);
        const ivaRepercutido = parseFloat((ingresos - baseIngresos).toFixed(2));
        const ivaSoportado = parseFloat((gastos - basePur).toFixed(2));
        return {
          ingresos: parseFloat(ingresos.toFixed(2)),
          gastos: parseFloat(gastos.toFixed(2)),
          margen: parseFloat((ingresos - gastos).toFixed(2)),
          iva_repercutido: ivaRepercutido,
          iva_soportado: ivaSoportado,
          cuota_iva: parseFloat((ivaRepercutido - ivaSoportado).toFixed(2)),
          docs_ventas: inv.length,
          docs_compras: pur.length,
        };
      };

      const cur = sumPeriod(curInv, curPur);
      const prev = sumPeriod(prevInv, prevPur);

      const delta = (a: number, b: number) => {
        const diff = parseFloat((a - b).toFixed(2));
        const pct = b !== 0 ? parseFloat(((diff / Math.abs(b)) * 100).toFixed(1)) : null;
        return { diff, pct };
      };

      return JSON.stringify({
        tenant_id: tenantId,
        tipo,
        periodo_actual: curLabel,
        periodo_anterior: prevLabel,
        comparativa: {
          ingresos: {
            actual: cur.ingresos,
            anterior: prev.ingresos,
            ...delta(cur.ingresos, prev.ingresos),
          },
          gastos: { actual: cur.gastos, anterior: prev.gastos, ...delta(cur.gastos, prev.gastos) },
          margen: { actual: cur.margen, anterior: prev.margen, ...delta(cur.margen, prev.margen) },
          iva_repercutido: {
            actual: cur.iva_repercutido,
            anterior: prev.iva_repercutido,
            ...delta(cur.iva_repercutido, prev.iva_repercutido),
          },
          iva_soportado: {
            actual: cur.iva_soportado,
            anterior: prev.iva_soportado,
            ...delta(cur.iva_soportado, prev.iva_soportado),
          },
          cuota_iva: {
            actual: cur.cuota_iva,
            anterior: prev.cuota_iva,
            ...delta(cur.cuota_iva, prev.cuota_iva),
          },
        },
        documentos: {
          ventas_actual: cur.docs_ventas,
          ventas_anterior: prev.docs_ventas,
          compras_actual: cur.docs_compras,
          compras_anterior: prev.docs_compras,
        },
        excel_block: {
          type: 'excel_export',
          filename: `comparativa-${tipo}-${tenantId.slice(0, 8)}.xlsx`,
          label: 'Descargar comparativa Excel',
          headers: ['Concepto', curLabel, prevLabel, 'Variación €', 'Variación %'],
          rows: [
            [
              'Ingresos (ventas)',
              cur.ingresos.toFixed(2),
              prev.ingresos.toFixed(2),
              delta(cur.ingresos, prev.ingresos).diff.toFixed(2),
              delta(cur.ingresos, prev.ingresos).pct !== null
                ? `${delta(cur.ingresos, prev.ingresos).pct}%`
                : 'N/A',
            ],
            [
              'Gastos (compras)',
              cur.gastos.toFixed(2),
              prev.gastos.toFixed(2),
              delta(cur.gastos, prev.gastos).diff.toFixed(2),
              delta(cur.gastos, prev.gastos).pct !== null
                ? `${delta(cur.gastos, prev.gastos).pct}%`
                : 'N/A',
            ],
            [
              'Margen bruto',
              cur.margen.toFixed(2),
              prev.margen.toFixed(2),
              delta(cur.margen, prev.margen).diff.toFixed(2),
              delta(cur.margen, prev.margen).pct !== null
                ? `${delta(cur.margen, prev.margen).pct}%`
                : 'N/A',
            ],
            [
              'IVA a ingresar/devolver',
              cur.cuota_iva.toFixed(2),
              prev.cuota_iva.toFixed(2),
              delta(cur.cuota_iva, prev.cuota_iva).diff.toFixed(2),
              delta(cur.cuota_iva, prev.cuota_iva).pct !== null
                ? `${delta(cur.cuota_iva, prev.cuota_iva).pct}%`
                : 'N/A',
            ],
          ],
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: `Error en comparativa: ${msg}`, tenant_id: tenantId });
    }
  }

  if (name === 'get_tenant_fiscal_analysis') {
    const tenantId = String(input.tenant_id ?? '');
    if (!tenantId) return JSON.stringify({ error: 'tenant_id es obligatorio' });

    const now = new Date();
    const year = typeof input.year === 'number' ? input.year : now.getUTCFullYear();
    const currentQ = Math.floor(now.getUTCMonth() / 3) + 1;
    const trimestre =
      typeof input.trimestre === 'number' && [1, 2, 3, 4].includes(input.trimestre)
        ? input.trimestre
        : currentQ;

    const qStart = new Date(Date.UTC(year, (trimestre - 1) * 3, 1, 0, 0, 0));
    const qEnd = new Date(Date.UTC(year, trimestre * 3, 0, 23, 59, 59));
    const qStartTs = Math.floor(qStart.getTime() / 1000);
    const qEndTs = Math.floor(qEnd.getTime() / 1000);

    const apiKey = await getTenantHoldedApiKey(tenantId);
    if (!apiKey) {
      return JSON.stringify({
        error: 'No hay API key válida para este tenant. Debe tener algún conector Holded activo.',
        tenant_id: tenantId,
      });
    }

    type HoldedDoc = {
      id?: string;
      docNumber?: string;
      date?: number;
      total?: number;
      subtotal?: number;
      tax?: number;
      retention?: number;
      contactName?: string;
      paid?: boolean;
      status?: number;
    };

    const fetchAllPages = async (docType: string): Promise<HoldedDoc[]> => {
      const results: HoldedDoc[] = [];
      for (let page = 1; page <= 4; page++) {
        const batch = (await callHoldedApi(apiKey!, `/api/invoicing/v1/documents/${docType}`, {
          page: String(page),
        }).catch(() => [])) as HoldedDoc[];
        if (!Array.isArray(batch) || batch.length === 0) break;
        results.push(...batch);
        if (batch.length < 15) break; // last page
      }
      return results;
    };

    try {
      const [allInvoices, allPurchases] = await Promise.all([
        fetchAllPages('invoice'),
        fetchAllPages('purchase'),
      ]);

      const invoicesQ = allInvoices.filter(
        (d) => typeof d.date === 'number' && d.date >= qStartTs && d.date <= qEndTs
      );
      const purchasesQ = allPurchases.filter(
        (d) => typeof d.date === 'number' && d.date >= qStartTs && d.date <= qEndTs
      );

      // Sum IVA: prefer tax field; estimate 21% from total-subtotal when missing
      const ivaFromDoc = (d: HoldedDoc): { base: number; iva: number } => {
        const total = d.total ?? 0;
        if (typeof d.subtotal === 'number' && d.subtotal > 0) {
          return { base: d.subtotal, iva: parseFloat((total - d.subtotal).toFixed(2)) };
        }
        if (typeof d.tax === 'number' && d.tax > 0) {
          return { base: parseFloat((total - d.tax).toFixed(2)), iva: d.tax };
        }
        // Fallback: assume 21%
        const base = parseFloat((total / 1.21).toFixed(2));
        return { base, iva: parseFloat((total - base).toFixed(2)) };
      };

      let baseVentas = 0;
      let ivaRepercutido = 0;
      let baseCompras = 0;
      let ivaSoportado = 0;
      let retenciones = 0;

      for (const d of invoicesQ) {
        const { base, iva } = ivaFromDoc(d);
        baseVentas += base;
        ivaRepercutido += iva;
      }
      for (const d of purchasesQ) {
        const { base, iva } = ivaFromDoc(d);
        baseCompras += base;
        ivaSoportado += iva;
        if (typeof d.retention === 'number' && d.retention > 0) {
          retenciones += d.retention;
        }
      }

      const cuotaIva = parseFloat((ivaRepercutido - ivaSoportado).toFixed(2));
      const qLabel = `T${trimestre} ${year}`;

      return JSON.stringify({
        tenant_id: tenantId,
        periodo: qLabel,
        trimestre,
        year,
        ventas: {
          documentos: invoicesQ.length,
          base_imponible: parseFloat(baseVentas.toFixed(2)),
          iva_repercutido: parseFloat(ivaRepercutido.toFixed(2)),
        },
        compras: {
          documentos: purchasesQ.length,
          base_imponible: parseFloat(baseCompras.toFixed(2)),
          iva_soportado: parseFloat(ivaSoportado.toFixed(2)),
        },
        resultado_iva: {
          cuota: cuotaIva,
          estado: cuotaIva >= 0 ? 'a_ingresar' : 'a_devolver',
          descripcion:
            cuotaIva >= 0
              ? `Cuota a ingresar en Hacienda: ${cuotaIva.toFixed(2)} €`
              : `Cuota a devolver por Hacienda: ${Math.abs(cuotaIva).toFixed(2)} €`,
        },
        retenciones_soportadas: {
          total: parseFloat(retenciones.toFixed(2)),
          nota:
            retenciones > 0
              ? 'Retenciones en facturas de compra (servicios profesionales). Deducibles en IRPF/IS.'
              : 'No se detectaron retenciones en los documentos de compra de este período.',
        },
        nota: `Estimación basada en ${invoicesQ.length + purchasesQ.length} documentos de ${qLabel}. Puede haber documentos fuera de la primera página. Consulta con tu asesor para cifras definitivas.`,
        excel_block: {
          type: 'excel_export',
          filename: `fiscal-${qLabel.toLowerCase().replace(' ', '-')}-${tenantId.slice(0, 8)}.xlsx`,
          label: 'Descargar análisis fiscal Excel',
          headers: ['Concepto', 'Base imponible (€)', 'IVA (€)', 'Resultado (€)'],
          rows: [
            ['IVA repercutido (ventas)', baseVentas.toFixed(2), ivaRepercutido.toFixed(2), ''],
            ['IVA soportado (compras)', baseCompras.toFixed(2), ivaSoportado.toFixed(2), ''],
            ['Retenciones soportadas', '', '', retenciones.toFixed(2)],
            [
              cuotaIva >= 0 ? 'CUOTA A INGRESAR' : 'CUOTA A DEVOLVER',
              '',
              '',
              Math.abs(cuotaIva).toFixed(2),
            ],
          ],
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        error: `Error en análisis fiscal: ${msg}`,
        tenant_id: tenantId,
      });
    }
  }

  if (name === 'get_tenant_holded_data') {
    const tenantId = String(input.tenant_id ?? '');
    const operacion = String(input.operacion ?? 'resumen');

    if (!tenantId) {
      return JSON.stringify({ error: 'tenant_id es obligatorio' });
    }

    const apiKey = await getTenantHoldedApiKey(tenantId);
    if (!apiKey) {
      return JSON.stringify({
        error:
          'No hay API key válida para este tenant. El tenant no tiene ninguna conexión Holded activa (ni vía Isaak, ni vía conector ChatGPT, ni vía conector Claude).',
        tenant_id: tenantId,
      });
    }

    try {
      if (operacion === 'contactos') {
        const contacts = (await callHoldedApi(apiKey, '/api/invoicing/v1/contacts')) as Array<{
          id?: string;
          name?: string;
          email?: string;
          type?: number;
          isPerson?: boolean;
        }>;
        const list = Array.isArray(contacts) ? contacts.slice(0, 30) : [];
        return JSON.stringify({
          total: list.length,
          contactos: list.map((c) => ({
            id: c.id,
            nombre: c.name,
            email: c.email,
            tipo: c.isPerson ? 'persona' : 'empresa',
          })),
        });
      }

      if (operacion === 'facturas_recientes' || operacion === 'compras_recientes') {
        const docType = operacion === 'facturas_recientes' ? 'invoice' : 'purchase';
        const docs = (await callHoldedApi(apiKey, `/api/invoicing/v1/documents/${docType}`, {
          page: '1',
        })) as Array<{
          id?: string;
          docNumber?: string;
          date?: number;
          contact?: string;
          contactName?: string;
          total?: number;
          status?: number;
          paid?: boolean;
        }>;
        const list = Array.isArray(docs) ? docs.slice(0, 25) : [];

        const statusLabel = (s?: number, paid?: boolean) => {
          if (paid) return 'cobrado';
          if (s === 1) return 'pendiente';
          if (s === 2) return 'vencido';
          if (s === 0) return 'borrador';
          return 'desconocido';
        };

        return JSON.stringify({
          tipo: docType,
          total: list.length,
          documentos: list.map((d) => ({
            numero: d.docNumber,
            fecha: d.date ? new Date(d.date * 1000).toISOString().slice(0, 10) : null,
            contacto: d.contactName ?? d.contact,
            total_eur: d.total,
            estado: statusLabel(d.status, d.paid),
          })),
        });
      }

      // resumen: invoices + purchases + contacts count
      const [invoices, purchases, contacts] = await Promise.all([
        callHoldedApi(apiKey, '/api/invoicing/v1/documents/invoice', { page: '1' }).catch(() => []),
        callHoldedApi(apiKey, '/api/invoicing/v1/documents/purchase', { page: '1' }).catch(
          () => []
        ),
        callHoldedApi(apiKey, '/api/invoicing/v1/contacts').catch(() => []),
      ]);

      const invList = Array.isArray(invoices) ? invoices : [];
      const purList = Array.isArray(purchases) ? purchases : [];
      const conList = Array.isArray(contacts) ? contacts : [];

      type DocRow = { total?: number; paid?: boolean; status?: number };
      const pendingInv = invList.filter((d: DocRow) => !d.paid && d.status !== 0).length;
      const totalInv = invList.reduce((s: number, d: DocRow) => s + (d.total ?? 0), 0);
      const totalPur = purList.reduce((s: number, d: DocRow) => s + (d.total ?? 0), 0);

      return JSON.stringify({
        tenant_id: tenantId,
        resumen: {
          facturas_recientes: invList.length,
          facturas_pendientes_cobro: pendingInv,
          total_facturado_eur: parseFloat(totalInv.toFixed(2)),
          compras_recientes: purList.length,
          total_compras_eur: parseFloat(totalPur.toFixed(2)),
          contactos: conList.length,
        },
        nota: 'Datos de la primera página (hasta 25 registros por tipo). Usa operacion=facturas_recientes para ver el detalle.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: `Error consultando Holded API: ${msg}`, tenant_id: tenantId });
    }
  }

  if (name === 'get_tenants_fiscal_overview') {
    const limit = typeof input.limit === 'number' ? Math.max(1, Math.min(50, input.limit)) : 20;
    const onlyActive = input.only_active === true;

    const rows = await query<{
      tenant_id: string;
      tenant_name: string;
      holded_channels: string;
      has_api_key: boolean;
      last_activity: string | null;
      queries_30d: number;
    }>(
      `SELECT
        ec.tenant_id,
        COALESCE(tp.legal_name, tp.company_name, ec.tenant_id::text) AS tenant_name,
        STRING_AGG(DISTINCT ec.channel_key, ', ' ORDER BY ec.channel_key) AS holded_channels,
        BOOL_OR(ec.api_key_enc IS NOT NULL) AS has_api_key,
        MAX(al.created_at)::text AS last_activity,
        COUNT(al.id) FILTER (WHERE al.created_at >= NOW() - INTERVAL '30 days')::int AS queries_30d
       FROM external_connections ec
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = ec.tenant_id
       LEFT JOIN holded_mcp_personal_access_tokens pat ON pat.connection_id = ec.id
       LEFT JOIN holded_mcp_pat_audit_logs al ON al.pat_id = pat.id AND al.event = 'used'
       WHERE ec.provider = 'holded' AND ec.connection_status = 'connected'
       GROUP BY ec.tenant_id, tp.legal_name, tp.company_name
       ${onlyActive ? "HAVING COUNT(al.id) FILTER (WHERE al.created_at >= NOW() - INTERVAL '30 days') > 0" : ''}
       ORDER BY MAX(al.created_at) DESC NULLS LAST
       LIMIT $1`,
      [limit]
    ).catch(
      () =>
        [] as {
          tenant_id: string;
          tenant_name: string;
          holded_channels: string;
          has_api_key: boolean;
          last_activity: string | null;
          queries_30d: number;
        }[]
    );

    const withApiKey = rows.filter((r) => r.has_api_key).length;
    const dormant = rows.filter((r) => r.queries_30d === 0).length;

    return JSON.stringify({
      total: rows.length,
      filtro: onlyActive ? 'activos_30d' : 'todos',
      con_api_key: withApiKey,
      dormidos_30d: dormant,
      tenants: rows.map((r) => ({
        tenant_id: r.tenant_id,
        nombre: r.tenant_name,
        canales_holded: r.holded_channels ?? '—',
        tiene_api_key: r.has_api_key,
        ultima_actividad: r.last_activity ?? 'nunca',
        queries_30d: r.queries_30d,
      })),
      excel_block:
        rows.length > 0
          ? {
              type: 'excel_export',
              filename: `tenants-fiscal-${new Date().toISOString().slice(0, 10)}.xlsx`,
              label: 'Descargar lista de tenants (Excel)',
              headers: [
                'Tenant ID',
                'Nombre',
                'Canales',
                'API Key',
                'Última actividad',
                'Queries 30d',
              ],
              rows: rows.map((r) => [
                r.tenant_id,
                r.tenant_name,
                r.holded_channels ?? '—',
                r.has_api_key ? 'Sí' : 'No',
                r.last_activity ?? 'nunca',
                String(r.queries_30d),
              ]),
            }
          : undefined,
    });
  }

  // ── V3.1.a — Action tools dispatcher ──────────────────────────────────────
  if (name === 'admin_extend_trial') {
    return withAudit(name, input, context, () => runExtendTrial(input));
  }
  if (name === 'admin_change_plan') {
    return withAudit(name, input, context, () => runChangePlan(input));
  }
  if (name === 'admin_cancel_subscription') {
    return withAudit(name, input, context, () => runCancelSubscription(input));
  }
  if (name === 'admin_impersonate_user') {
    return withAudit(name, input, context, () => runImpersonateUser(input));
  }
  if (name === 'admin_send_custom_email') {
    return withAudit(name, input, context, () => runSendCustomEmail(input));
  }
  if (name === 'admin_send_marketing_campaign') {
    return withAudit(name, input, context, () =>
      runSendMarketingCampaign(input, context?.adminEmail ?? 'unknown')
    );
  }
  if (name === 'admin_revoke_connector') {
    return withAudit(name, input, context, () => runRevokeConnector(input));
  }

  // ── V3.2 — Search & Analytics (read-only, sin audit) ──────────────────────
  if (name === 'search_global') return runSearchGlobal(input);
  if (name === 'find_tenant_by_nif') return runFindTenantByNif(input);
  if (name === 'top_tenants_by_mrr') return runTopTenantsByMrr(input);
  if (name === 'subscriptions_ending_soon') return runSubscriptionsEndingSoon(input);
  if (name === 'get_churn_30d') return runGetChurn30d();
  if (name === 'get_marketing_funnel') return runGetMarketingFunnel(input);

  return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
}

// V3.4 — Audit log: solo cuando la acción se EJECUTA (confirm=true).
async function withAudit(
  toolName: string,
  input: ToolInput,
  context: RunToolContext | undefined,
  exec: () => Promise<string>
): Promise<string> {
  const result = await exec();
  if (input.confirm === true && context?.adminEmail) {
    const tenantId =
      typeof input.tenant_id === 'string' ? input.tenant_id : (context.tenantId ?? null);
    void logCopilotAction({
      tool: toolName,
      args: input,
      adminEmail: context.adminEmail,
      adminUserId: context.adminUserId,
      tenantId,
      resultPreview: result,
    });
  }
  return result;
}

// ── V3.1.a — Implementaciones acciones admin ────────────────────────────────

async function runExtendTrial(input: ToolInput): Promise<string> {
  const tenantId = typeof input.tenant_id === 'string' ? input.tenant_id : '';
  const days = typeof input.days === 'number' ? Math.floor(input.days) : 0;
  const confirm = input.confirm === true;
  if (!tenantId || days < 1 || days > 90) {
    return JSON.stringify({ error: 'tenant_id obligatorio y days entre 1 y 90' });
  }

  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ['active', 'trial', 'past_due'] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { name: true, code: true } }, tenant: { select: { name: true } } },
  });
  if (!sub) {
    return JSON.stringify({ error: 'El tenant no tiene suscripción activa' });
  }

  const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
  const newTrialEndsAt = new Date(base.getTime() + days * 86_400_000);

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'extend_trial',
      tenant: { id: tenantId, name: sub.tenant.name },
      current: {
        plan: sub.plan.name,
        status: sub.status,
        trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      },
      changes: {
        newTrialEndsAt: newTrialEndsAt.toISOString(),
        newStatus: 'trial',
        addedDays: days,
      },
      message: `Esto extendería el trial de "${sub.tenant.name}" hasta ${newTrialEndsAt.toLocaleDateString('es-ES')} (${days}d más).`,
    });
  }

  const updated = await prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: { trialEndsAt: newTrialEndsAt, status: 'trial' },
  });
  return JSON.stringify({
    executed: true,
    action: 'extend_trial',
    tenant: { id: tenantId, name: sub.tenant.name },
    newTrialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
    message: `Trial de "${sub.tenant.name}" extendido ${days}d hasta ${updated.trialEndsAt?.toLocaleDateString('es-ES')}.`,
  });
}

async function runChangePlan(input: ToolInput): Promise<string> {
  const tenantId = typeof input.tenant_id === 'string' ? input.tenant_id : '';
  const planId = typeof input.plan_id === 'number' ? Math.floor(input.plan_id) : 0;
  const confirm = input.confirm === true;
  if (!tenantId || planId < 1) {
    return JSON.stringify({ error: 'tenant_id y plan_id obligatorios' });
  }

  const [sub, newPlan] = await Promise.all([
    prisma.tenantSubscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trial', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, tenant: { select: { name: true } } },
    }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!sub) return JSON.stringify({ error: 'El tenant no tiene suscripción activa' });
  if (!newPlan) return JSON.stringify({ error: `No existe Plan id=${planId}` });

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'change_plan',
      tenant: { id: tenantId, name: sub.tenant.name },
      current: { plan: sub.plan.name, monthly: Number(sub.plan.fixedMonthly) },
      next: { plan: newPlan.name, monthly: Number(newPlan.fixedMonthly) },
      delta: Number(newPlan.fixedMonthly) - Number(sub.plan.fixedMonthly),
      message: `Esto cambiaría a "${sub.tenant.name}" del plan ${sub.plan.name} (${Number(sub.plan.fixedMonthly)}€/mes) al plan ${newPlan.name} (${Number(newPlan.fixedMonthly)}€/mes).`,
    });
  }

  await prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: { planId },
  });
  return JSON.stringify({
    executed: true,
    action: 'change_plan',
    tenant: { id: tenantId, name: sub.tenant.name },
    newPlan: newPlan.name,
    newMonthly: Number(newPlan.fixedMonthly),
    message: `Plan de "${sub.tenant.name}" cambiado a ${newPlan.name} (${Number(newPlan.fixedMonthly)}€/mes).`,
  });
}

async function runCancelSubscription(input: ToolInput): Promise<string> {
  const tenantId = typeof input.tenant_id === 'string' ? input.tenant_id : '';
  const confirm = input.confirm === true;
  if (!tenantId) return JSON.stringify({ error: 'tenant_id obligatorio' });

  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ['active', 'trial', 'past_due'] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { name: true } }, tenant: { select: { name: true } } },
  });
  if (!sub) return JSON.stringify({ error: 'El tenant no tiene suscripción activa' });

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'cancel_subscription',
      tenant: { id: tenantId, name: sub.tenant.name },
      current: {
        plan: sub.plan.name,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
      },
      message: `Esto cancelaría la suscripción de "${sub.tenant.name}" (${sub.plan.name}) al final del período actual${
        sub.currentPeriodEnd ? ` (${sub.currentPeriodEnd.toLocaleDateString('es-ES')})` : ''
      }. No es un hard-delete: el acceso se mantiene hasta esa fecha.`,
    });
  }

  await prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });
  return JSON.stringify({
    executed: true,
    action: 'cancel_subscription',
    tenant: { id: tenantId, name: sub.tenant.name },
    message: `Suscripción de "${sub.tenant.name}" marcada para cancelación al final del período actual.`,
  });
}

async function runImpersonateUser(input: ToolInput): Promise<string> {
  const userId = typeof input.user_id === 'string' ? input.user_id : '';
  const reason = typeof input.reason === 'string' ? input.reason.slice(0, 200) : 'no especificado';
  const confirm = input.confirm === true;
  if (!userId) return JSON.stringify({ error: 'user_id obligatorio' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return JSON.stringify({ error: 'Usuario no encontrado' });

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'impersonate_user',
      user: { id: user.id, email: user.email, name: user.name },
      reason,
      message: `Esto generará un enlace para abrir Isaak suplantando a ${user.email}. Quedará auditado.`,
    });
  }

  // El enlace lleva al panel admin con un endpoint que setea la cookie y
  // redirige a Isaak. Mantenemos la lógica existente intacta.
  return JSON.stringify({
    executed: true,
    action: 'impersonate_user',
    user: { id: user.id, email: user.email, name: user.name },
    reason,
    impersonateUrl: `/users/${user.id}#impersonate`,
    message: `Listo. Ve a la ficha de ${user.email} y pulsa "Abrir Isaak suplantando" para iniciar la sesión.`,
  });
}

// ── V3.1.b — Marketing / conectores ─────────────────────────────────────────

const RESEND_FROM = 'Isaak <noreply@isaak.app>';

function renderEmailHtml(body: string): string {
  // Convierte saltos dobles en <p> y simples en <br>. Defensivo, sin libs.
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = safe
    .split(/\n{2,}/)
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.5;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1a202c; max-width: 600px;">${paragraphs}</div>`;
}

async function runSendCustomEmail(input: ToolInput): Promise<string> {
  const userId = typeof input.user_id === 'string' ? input.user_id : '';
  const emailArg = typeof input.email === 'string' ? input.email.trim() : '';
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const body = typeof input.body === 'string' ? input.body : '';
  const confirm = input.confirm === true;
  if (!subject || !body) {
    return JSON.stringify({ error: 'subject y body obligatorios' });
  }

  // Resolver destinatario
  let to = emailArg;
  let userMeta: { id: string; email: string | null; name: string | null } | null = null;
  if (userId) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!u) return JSON.stringify({ error: 'Usuario no encontrado' });
    if (!u.email) return JSON.stringify({ error: 'Usuario sin email registrado' });
    to = u.email;
    userMeta = u;
  }
  if (!to) {
    return JSON.stringify({ error: 'user_id o email obligatorio' });
  }

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'send_custom_email',
      to,
      user: userMeta,
      subject,
      bodyLength: body.length,
      message: `Esto enviaría un email a ${to} con asunto "${subject}" (${body.length} caracteres).`,
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return JSON.stringify({ error: 'RESEND_API_KEY no configurada' });
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: [to],
      subject,
      text: body,
      html: renderEmailHtml(body),
    });
    if (result.error) {
      return JSON.stringify({ error: `Resend: ${result.error.message ?? 'unknown'}` });
    }
    return JSON.stringify({
      executed: true,
      action: 'send_custom_email',
      to,
      messageId: result.data?.id ?? null,
      message: `Email enviado a ${to}.`,
    });
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : 'send_failed' });
  }
}

type Segment = 'all_users' | 'holded_connected' | 'holded_error';

const SEGMENT_QUERY: Record<Segment, string> = {
  all_users: `
    SELECT DISTINCT u.email, u.name
    FROM users u
    WHERE u.email IS NOT NULL AND u."isBlocked" = false
    ORDER BY u.email
  `,
  holded_connected: `
    SELECT DISTINCT u.email, u.name
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    JOIN external_connections ec ON ec.tenant_id = m.tenant_id
    WHERE ec.provider = 'holded' AND ec.connection_status = 'connected'
      AND u.email IS NOT NULL AND u."isBlocked" = false
    ORDER BY u.email
  `,
  holded_error: `
    SELECT DISTINCT u.email, u.name
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    JOIN external_connections ec ON ec.tenant_id = m.tenant_id
    WHERE ec.provider = 'holded' AND ec.connection_status IN ('error', 'revoked_api')
      AND u.email IS NOT NULL AND u."isBlocked" = false
    ORDER BY u.email
  `,
};

async function runSendMarketingCampaign(input: ToolInput, adminEmail: string): Promise<string> {
  const segment = (input.segment as Segment) ?? '';
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const body = typeof input.body === 'string' ? input.body : '';
  const confirm = input.confirm === true;
  if (!Object.keys(SEGMENT_QUERY).includes(segment)) {
    return JSON.stringify({ error: 'segment debe ser all_users, holded_connected o holded_error' });
  }
  if (!subject || !body) {
    return JSON.stringify({ error: 'subject y body obligatorios' });
  }

  // Contar destinatarios
  const recipients = await query<{ email: string; name: string | null }>(
    SEGMENT_QUERY[segment],
    []
  );
  const total = recipients.length;

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'send_marketing_campaign',
      segment,
      subject,
      bodyLength: body.length,
      recipients: total,
      sampleEmails: recipients.slice(0, 5).map((r) => r.email),
      message: `Esto enviaría la campaña "${subject}" a ${total} destinatarios del segmento "${segment}". Acción potencialmente masiva.`,
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return JSON.stringify({ error: 'RESEND_API_KEY no configurada' });
  }
  if (total === 0) {
    return JSON.stringify({ error: 'Segmento sin destinatarios' });
  }

  // Crear registro de campaña ANTES de enviar (para audit)
  const campaign = await prisma.marketingCampaign.create({
    data: {
      segment,
      subject,
      sentBy: adminEmail,
      totalCount: total,
    },
  });

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = renderEmailHtml(body);

  let sentCount = 0;
  let failCount = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const res = await resend.emails.send({
            from: RESEND_FROM,
            to: [r.email],
            subject,
            text: body,
            html,
          });
          if (res.error) failCount += 1;
          else sentCount += 1;
        } catch {
          failCount += 1;
        }
      })
    );
  }

  await prisma.marketingCampaign.update({
    where: { id: campaign.id },
    data: { sentCount, failCount },
  });

  return JSON.stringify({
    executed: true,
    action: 'send_marketing_campaign',
    campaignId: campaign.id,
    segment,
    sent: sentCount,
    failed: failCount,
    total,
    message: `Campaña enviada: ${sentCount} OK, ${failCount} fallidos de ${total} totales. Registrada como MarketingCampaign ${campaign.id.slice(0, 8)}…`,
  });
}

// ── V3.2 — Search & Analytics ──────────────────────────────────────────────

async function runSearchGlobal(input: ToolInput): Promise<string> {
  const q = typeof input.query === 'string' ? input.query.trim() : '';
  if (q.length < 2) return JSON.stringify({ error: 'query mínimo 2 caracteres' });

  const [users, tenants, conversations] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: { id: true, email: true, name: true, isBlocked: true },
    }),
    prisma.tenant.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { legalName: { contains: q, mode: 'insensitive' } },
          { nif: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: { id: true, name: true, nif: true, legalName: true },
    }),
    prisma.isaakConversation.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        tenantId: true,
        tenant: { select: { name: true } },
      },
    }),
  ]);

  return JSON.stringify({
    query: q,
    counts: { users: users.length, tenants: tenants.length, conversations: conversations.length },
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isBlocked: u.isBlocked,
      url: `/users/${u.id}`,
    })),
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      legalName: t.legalName,
      nif: t.nif,
      url: `/tenants/${t.id}/overview`,
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      tenant: c.tenant.name,
      tenantId: c.tenantId,
      updatedAt: c.updatedAt.toISOString(),
      url: `/tenants/${c.tenantId}/isaak`,
    })),
  });
}

async function runFindTenantByNif(input: ToolInput): Promise<string> {
  const nifRaw = typeof input.nif === 'string' ? input.nif.trim().toUpperCase() : '';
  if (!nifRaw) return JSON.stringify({ error: 'nif obligatorio' });

  const tenants = await prisma.tenant.findMany({
    where: { nif: nifRaw },
    select: {
      id: true,
      name: true,
      legalName: true,
      nif: true,
      createdAt: true,
      tenantSubscriptions: {
        where: { status: { in: ['active', 'trial', 'past_due', 'paused'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { plan: { select: { name: true, code: true, fixedMonthly: true } } },
      },
      externalConnections: {
        where: { provider: 'holded' },
        select: { id: true, channelKey: true, connectionStatus: true, lastSyncAt: true },
      },
      _count: { select: { users: true, isaakConversations: true } },
    },
  });

  if (tenants.length === 0) return JSON.stringify({ found: 0, nif: nifRaw });

  return JSON.stringify({
    found: tenants.length,
    nif: nifRaw,
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      legalName: t.legalName,
      createdAt: t.createdAt.toISOString().slice(0, 10),
      subscription: t.tenantSubscriptions[0]
        ? {
            plan: t.tenantSubscriptions[0].plan.name,
            status: t.tenantSubscriptions[0].status,
            monthly: Number(t.tenantSubscriptions[0].plan.fixedMonthly),
          }
        : null,
      holdedConnections: t.externalConnections.map((c) => ({
        channel: c.channelKey,
        status: c.connectionStatus,
        lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      })),
      members: t._count.users,
      conversations: t._count.isaakConversations,
      url: `/tenants/${t.id}/overview`,
    })),
  });
}

async function runTopTenantsByMrr(input: ToolInput): Promise<string> {
  const limit =
    typeof input.limit === 'number' ? Math.max(1, Math.min(50, Math.floor(input.limit))) : 10;

  const subs = await prisma.tenantSubscription.findMany({
    where: { status: 'active' },
    include: {
      plan: { select: { name: true, fixedMonthly: true } },
      tenant: { select: { id: true, name: true, nif: true } },
    },
  });

  const sorted = subs
    .map((s) => ({
      tenantId: s.tenant.id,
      tenantName: s.tenant.name,
      nif: s.tenant.nif,
      plan: s.plan.name,
      monthly: Number(s.plan.fixedMonthly),
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, limit);

  const totalMrr = sorted.reduce((acc, s) => acc + s.monthly, 0);

  return JSON.stringify({
    limit,
    totalActiveSubs: subs.length,
    sampleMrr: totalMrr,
    top: sorted.map((s) => ({ ...s, url: `/tenants/${s.tenantId}/billing` })),
  });
}

async function runSubscriptionsEndingSoon(input: ToolInput): Promise<string> {
  const days =
    typeof input.days === 'number' ? Math.max(1, Math.min(60, Math.floor(input.days))) : 7;
  const horizon = new Date(Date.now() + days * 86_400_000);

  const subs = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: ['active', 'trial'] },
      OR: [
        { trialEndsAt: { gte: new Date(), lte: horizon } },
        { currentPeriodEnd: { gte: new Date(), lte: horizon } },
      ],
    },
    include: {
      plan: { select: { name: true, fixedMonthly: true } },
      tenant: { select: { id: true, name: true, nif: true } },
    },
    orderBy: { trialEndsAt: 'asc' },
  });

  return JSON.stringify({
    horizon_days: days,
    count: subs.length,
    subs: subs.map((s) => {
      const endTrial = s.trialEndsAt;
      const endPeriod = s.currentPeriodEnd;
      return {
        tenantId: s.tenant.id,
        tenantName: s.tenant.name,
        plan: s.plan.name,
        status: s.status,
        monthly: Number(s.plan.fixedMonthly),
        trialEndsAt: endTrial?.toISOString().slice(0, 10) ?? null,
        currentPeriodEnd: endPeriod?.toISOString().slice(0, 10) ?? null,
        url: `/tenants/${s.tenant.id}/billing`,
      };
    }),
  });
}

async function runGetChurn30d(): Promise<string> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  // Cancelaciones puras
  const cancelled = await prisma.tenantSubscription.findMany({
    where: {
      status: 'cancelled',
      updatedAt: { gte: thirtyDaysAgo },
    },
    include: {
      plan: { select: { name: true, fixedMonthly: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  // Set para cancelar
  const pendingCancel = await prisma.tenantSubscription.findMany({
    where: { cancelAtPeriodEnd: true, status: { in: ['active', 'past_due'] } },
    include: {
      plan: { select: { name: true, fixedMonthly: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  const lostMrr = cancelled.reduce((acc, s) => acc + Number(s.plan.fixedMonthly), 0);
  const pendingMrr = pendingCancel.reduce((acc, s) => acc + Number(s.plan.fixedMonthly), 0);

  return JSON.stringify({
    period: '30d',
    cancelled_count: cancelled.length,
    cancelled_mrr_lost: lostMrr,
    pending_cancel_count: pendingCancel.length,
    pending_cancel_mrr: pendingMrr,
    cancelled: cancelled.map((s) => ({
      tenantId: s.tenant.id,
      tenantName: s.tenant.name,
      plan: s.plan.name,
      monthly: Number(s.plan.fixedMonthly),
      cancelledAt: s.updatedAt.toISOString().slice(0, 10),
      url: `/tenants/${s.tenant.id}/billing`,
    })),
    pending_cancel: pendingCancel.map((s) => ({
      tenantId: s.tenant.id,
      tenantName: s.tenant.name,
      plan: s.plan.name,
      monthly: Number(s.plan.fixedMonthly),
      url: `/tenants/${s.tenant.id}/billing`,
    })),
  });
}

async function runGetMarketingFunnel(input: ToolInput): Promise<string> {
  const days =
    typeof input.days === 'number' ? Math.max(1, Math.min(365, Math.floor(input.days))) : 30;
  const since = new Date(Date.now() - days * 86_400_000);

  const [leads, demos, trialStarted, activePaying] = await Promise.all([
    prisma.usageEvent.count({
      where: { type: 'LEAD_CREATED', createdAt: { gte: since } },
    }),
    prisma.demoRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.tenantSubscription.count({
      where: { status: 'trial', createdAt: { gte: since } },
    }),
    prisma.tenantSubscription.count({
      where: { status: 'active', createdAt: { gte: since } },
    }),
  ]);

  const ratios = {
    lead_to_demo: leads > 0 ? Math.round((demos / leads) * 1000) / 10 : null,
    demo_to_trial: demos > 0 ? Math.round((trialStarted / demos) * 1000) / 10 : null,
    trial_to_active:
      trialStarted > 0 ? Math.round((activePaying / trialStarted) * 1000) / 10 : null,
  };

  return JSON.stringify({
    period_days: days,
    funnel: {
      leads,
      demos,
      trials_started: trialStarted,
      active_paying: activePaying,
    },
    ratios_pct: ratios,
    interpretation: {
      lead_to_demo:
        ratios.lead_to_demo !== null ? `${ratios.lead_to_demo}% leads piden demo` : 'sin datos',
      demo_to_trial:
        ratios.demo_to_trial !== null
          ? `${ratios.demo_to_trial}% demos arrancan trial`
          : 'sin datos',
      trial_to_active:
        ratios.trial_to_active !== null
          ? `${ratios.trial_to_active}% trials convierten a plan pago`
          : 'sin datos',
    },
  });
}

async function runRevokeConnector(input: ToolInput): Promise<string> {
  const connectionId = typeof input.connection_id === 'string' ? input.connection_id : '';
  const reason = typeof input.reason === 'string' ? input.reason.slice(0, 200) : 'no especificado';
  const confirm = input.confirm === true;
  if (!connectionId) {
    return JSON.stringify({ error: 'connection_id obligatorio' });
  }

  const conn = await prisma.externalConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      tenantId: true,
      provider: true,
      channelKey: true,
      connectionStatus: true,
      tenant: { select: { name: true } },
    },
  });
  if (!conn) return JSON.stringify({ error: 'Conexión no encontrada' });
  if (conn.provider !== 'holded') {
    return JSON.stringify({ error: 'Solo se admiten conexiones provider=holded' });
  }

  if (!confirm) {
    return JSON.stringify({
      preview: true,
      action: 'revoke_connector',
      connection: {
        id: conn.id,
        tenant: conn.tenant.name,
        channel: conn.channelKey,
        currentStatus: conn.connectionStatus,
      },
      reason,
      message: `Esto revocaría la conexión Holded (canal ${conn.channelKey}) de "${conn.tenant.name}". El tenant tendrá que reconectar. Reversible vía /api/admin/connectors/${conn.id}/reactivate.`,
    });
  }

  await prisma.externalConnection.update({
    where: { id: connectionId },
    data: {
      connectionStatus: 'revoked_api',
      apiKeyEnc: null,
    },
  });
  return JSON.stringify({
    executed: true,
    action: 'revoke_connector',
    connection: { id: conn.id, tenant: conn.tenant.name },
    reason,
    message: `Conexión Holded de "${conn.tenant.name}" revocada. Reactivable desde /connectors/${conn.id}.`,
  });
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
