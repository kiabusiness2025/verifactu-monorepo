/**
 * Herramientas y configuración compartidas del copiloto Isaak admin.
 * Usadas por /api/admin/isaak/chat y /api/admin/isaak/smoke.
 */

import { createDecipheriv, createHash } from 'crypto';
import { query } from '@/lib/db';

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

5. Datos Holded del tenant: cuando uses get_tenant_holded_data, presenta los datos como tablas Markdown. Si la operación devuelve facturas, muestra las columnas más relevantes (número, fecha, contacto, importe, estado). Si hay errores de API o clave no disponible, informa al administrador.`;

export type ToolInput = Record<string, unknown>;

export type ToolName =
  | 'get_activity_stats'
  | 'list_dormant_tenants'
  | 'get_connector_errors'
  | 'get_activity_timeline'
  | 'suggest_accounting_entry'
  | 'validate_verifactu_invoice'
  | 'get_tenant_holded_data';

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
