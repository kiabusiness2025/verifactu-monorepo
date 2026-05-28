// Sector software LLM tools — HotelGest, Loyverse, Revo XEF, WooCommerce, PrestaShop, etc.
//
// These tools surface data from the tenant's connected sector software (PMS, POS, ERP)
// to the LLM chat agent. They use the ErpClient abstraction layer so the LLM doesn't
// need to know which specific provider is connected.
//
// All tools are read-only. Data is fetched at call time (no cache).

import { prisma } from './prisma';
import { decryptHoldedSecret } from './holded-integration';

// ─── Provider registry ─────────────────────────────────────────────────────────

export const SECTOR_ERP_PROVIDERS = [
  'hotelgest',
  'revo',
  'loyverse',
  'woocommerce',
  'prestashop',
  'mindbody',
  'inmovilla',
  'nubimed',
] as const;

export type SectorErpProvider = (typeof SECTOR_ERP_PROVIDERS)[number];

const SECTOR_LABELS: Record<SectorErpProvider, string> = {
  hotelgest: 'HotelGest (Hotel PMS)',
  loyverse: 'Loyverse POS (Retail / Comercio)',
  revo: 'Revo XEF (Restaurantes / Hostelería)',
  woocommerce: 'WooCommerce (Tienda online)',
  prestashop: 'PrestaShop (Tienda online)',
  mindbody: 'Mindbody (Salud y bienestar)',
  inmovilla: 'Inmovilla (Inmobiliarias)',
  nubimed: 'Nubimed (Clínicas / Dental)',
};

// ─── Tool names ────────────────────────────────────────────────────────────────

const SECTOR_TOOL_NAMES = [
  'sector_check_connection',
  'sector_get_snapshot',
  'sector_list_invoices',
  'sector_list_contacts',
  'sector_list_products',
] as const;

export type SectorToolName = (typeof SECTOR_TOOL_NAMES)[number];

export function isSectorToolName(name: string): name is SectorToolName {
  return (SECTOR_TOOL_NAMES as readonly string[]).includes(name);
}

// ─── Tool definitions (Anthropic format) ──────────────────────────────────────

type AnthropicToolDef = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

export const SECTOR_CHAT_TOOLS: AnthropicToolDef[] = [
  {
    name: 'sector_check_connection',
    description:
      'Comprueba qué software de gestión sectorial tiene conectado el negocio (HotelGest, Loyverse, Revo XEF, WooCommerce, etc.). Úsala cuando el usuario pregunte por sus datos de ventas, reservas, pedidos, o clientes y no quede claro qué plataforma usa.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'sector_get_snapshot',
    description:
      'Devuelve un resumen del negocio desde su software sectorial: ventas totales, número de transacciones/reservas, clientes únicos y productos/servicios top. Útil para preguntas del tipo "¿cómo han ido las ventas este mes?" o "¿cuánto hemos facturado este trimestre?".',
    input_schema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Fecha inicio en formato YYYY-MM-DD (por defecto: hace 30 días).',
        },
        to: {
          type: 'string',
          description: 'Fecha fin en formato YYYY-MM-DD (por defecto: hoy).',
        },
      },
      required: [],
    },
  },
  {
    name: 'sector_list_invoices',
    description:
      'Lista las últimas transacciones, reservas o facturas del software sectorial (ventas, tickets POS, reservas hoteleras…). Útil para consultas sobre ingresos recientes, clientes concretos o pagos pendientes.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Fecha inicio YYYY-MM-DD.' },
        to: { type: 'string', description: 'Fecha fin YYYY-MM-DD.' },
        limit: {
          type: 'number',
          description: 'Número máximo de registros (máx. 100). Por defecto 50.',
        },
      },
      required: [],
    },
  },
  {
    name: 'sector_list_contacts',
    description:
      'Lista los clientes, huéspedes o miembros registrados en el software sectorial. Útil para búsquedas de clientes, análisis de cartera o ver quiénes son los clientes más activos.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de contactos (máx. 200). Por defecto 100.',
        },
      },
      required: [],
    },
  },
  {
    name: 'sector_list_products',
    description:
      'Lista los productos, servicios, tipos de habitación o artículos del catálogo del software sectorial. Útil para preguntas sobre tarifas, catálogo de productos o disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de productos (máx. 200). Por defecto 100.',
        },
      },
      required: [],
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function getConnectedSectorProviders(
  tenantId: string
): Promise<Array<{ provider: SectorErpProvider; apiKey: string; connectedAt: string }>> {
  const rows = await prisma.externalConnection.findMany({
    where: {
      tenantId,
      provider: { in: [...SECTOR_ERP_PROVIDERS] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
    select: { provider: true, apiKeyEnc: true, connectedAt: true },
  });

  return rows
    .map((r) => ({
      provider: r.provider as SectorErpProvider,
      apiKey: r.apiKeyEnc ? decryptHoldedSecret(r.apiKeyEnc) : '',
      connectedAt: r.connectedAt?.toISOString() ?? '',
    }))
    .filter((r) => r.apiKey);
}

async function getPrimaryErpClient(tenantId: string) {
  const { getErpClient, ErpNotConnectedError } = await import('./erp-client-factory');
  try {
    return await getErpClient(tenantId);
  } catch (err) {
    if (err instanceof ErpNotConnectedError) return null;
    throw err;
  }
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}

// ─── Tool executor ─────────────────────────────────────────────────────────────

export async function executeSectorTool(
  tenantId: string,
  name: SectorToolName,
  input: unknown
): Promise<unknown> {
  const params = (input ?? {}) as Record<string, unknown>;

  if (name === 'sector_check_connection') {
    const providers = await getConnectedSectorProviders(tenantId);
    if (providers.length === 0) {
      return {
        connected: false,
        message:
          'No hay ningún software sectorial conectado. El usuario puede conectar HotelGest, Loyverse, Revo XEF u otros desde Ajustes → Integraciones.',
      };
    }
    return {
      connected: true,
      providers: providers.map((p) => ({
        provider: p.provider,
        label: SECTOR_LABELS[p.provider] ?? p.provider,
        connectedAt: p.connectedAt,
      })),
    };
  }

  const client = await getPrimaryErpClient(tenantId);
  if (!client) {
    return {
      error: 'sector_not_connected',
      message:
        'No hay software sectorial conectado para este negocio. Usa sector_check_connection para confirmar.',
    };
  }

  const providerLabel = SECTOR_LABELS[client.provider as SectorErpProvider] ?? client.provider;

  if (name === 'sector_get_snapshot') {
    const from = typeof params.from === 'string' ? params.from : undefined;
    const to = typeof params.to === 'string' ? params.to : undefined;

    const snapshot = await client.getSnapshot({ from, to });

    const totalRevenue = snapshot.invoices.reduce((s, inv) => s + inv.total, 0);
    const totalTax = snapshot.invoices.reduce((s, inv) => s + inv.tax, 0);
    const paidCount = snapshot.invoices.filter((i) => i.status === 'paid').length;
    const pendingCount = snapshot.invoices.filter(
      (i) => i.status === 'sent' || i.status === 'draft'
    ).length;

    const topProducts = snapshot.invoices
      .flatMap((inv) => inv.lines)
      .reduce<Record<string, number>>((acc, line) => {
        acc[line.description] = (acc[line.description] ?? 0) + line.total;
        return acc;
      }, {});
    const topProductsSorted = Object.entries(topProducts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([desc, total]) => ({ description: desc, total: formatCurrency(total) }));

    return {
      provider: providerLabel,
      period: snapshot.period,
      summary: {
        totalRevenue: formatCurrency(totalRevenue),
        totalTax: formatCurrency(totalTax),
        totalNet: formatCurrency(totalRevenue - totalTax),
        transactionCount: snapshot.invoices.length,
        paidCount,
        pendingCount,
        uniqueContacts: snapshot.contacts.length,
      },
      topItems: topProductsSorted,
      fetchedAt: snapshot.fetchedAt,
    };
  }

  if (name === 'sector_list_invoices') {
    const from = typeof params.from === 'string' ? params.from : undefined;
    const to = typeof params.to === 'string' ? params.to : undefined;
    const limit = typeof params.limit === 'number' ? Math.min(params.limit, 100) : 50;

    const invoices = await client.listInvoices({ from, to, limit });
    return {
      provider: providerLabel,
      count: invoices.length,
      invoices: invoices.slice(0, limit).map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.date,
        dueDate: inv.dueDate,
        contact: inv.contactName || inv.contactId,
        total: formatCurrency(inv.total, inv.currency),
        tax: formatCurrency(inv.tax, inv.currency),
        status: inv.status,
        type: inv.type,
        lines: inv.lines.slice(0, 5).map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: formatCurrency(l.unitPrice, inv.currency),
          total: formatCurrency(l.total, inv.currency),
        })),
      })),
    };
  }

  if (name === 'sector_list_contacts') {
    const limit = typeof params.limit === 'number' ? Math.min(params.limit, 200) : 100;
    const contacts = await client.listContacts({ limit });
    return {
      provider: providerLabel,
      count: contacts.length,
      contacts: contacts.slice(0, limit).map((c) => ({
        id: c.id,
        name: c.name,
        nif: c.nif,
        email: c.email,
        phone: c.phone,
        type: c.type,
      })),
    };
  }

  if (name === 'sector_list_products') {
    const limit = typeof params.limit === 'number' ? Math.min(params.limit, 200) : 100;
    const products = await client.listProducts({ limit });
    return {
      provider: providerLabel,
      count: products.length,
      products: products.slice(0, limit).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: formatCurrency(p.price),
        stock: p.stock,
        taxRate: p.taxRate,
      })),
    };
  }

  return { error: 'unknown_sector_tool', tool: name };
}

// ─── Context check ─────────────────────────────────────────────────────────────

export async function hasSectorErpConnected(tenantId: string): Promise<boolean> {
  const count = await prisma.externalConnection.count({
    where: {
      tenantId,
      provider: { in: [...SECTOR_ERP_PROVIDERS] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
