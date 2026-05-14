/**
 * POST /api/admin/smoke-tests
 *
 * Ejecuta ~22 checks read-only contra la API de Holded (sin CRUD) y devuelve
 * los resultados inmediatamente. Detecta respuestas HTML, errores HTTP y
 * timeouts para identificar endpoints rotos.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HOLDED_BASE = 'https://api.holded.com';

export type SmokeCheckResult = {
  name: string;
  ok: boolean;
  status: number;
  message: string;
};

export type SmokeTestResponse = {
  results: SmokeCheckResult[];
  summary: { passed: number; failed: number; total: number };
  runAt: string;
};

async function runCheck(apiKey: string, name: string, url: string): Promise<SmokeCheckResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        key: apiKey,
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    const text = await response.text();
    const isHtml = text.trimStart().startsWith('<');

    if (isHtml) {
      return {
        name,
        ok: false,
        status: response.status,
        message: 'Devuelve HTML (endpoint sin API REST)',
      };
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const detail =
          (parsed.info as string) || (parsed.error as string) || (parsed.message as string) || null;
        if (detail) errorMsg = detail;
      } catch {
        // keep default
      }
      return { name, ok: false, status: response.status, message: errorMsg };
    }

    try {
      const parsed = JSON.parse(text);
      const count = Array.isArray(parsed)
        ? parsed.length
        : parsed && typeof parsed === 'object' && 'employees' in parsed
          ? ((parsed as Record<string, unknown[]>).employees?.length ?? null)
          : null;
      return {
        name,
        ok: true,
        status: response.status,
        message: count !== null ? `${count} items` : 'OK',
      };
    } catch {
      return { name, ok: true, status: response.status, message: 'OK' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red';
    return { name, ok: false, status: 0, message: msg };
  }
}

export async function POST(req: NextRequest) {
  await requireAdmin(req);

  const apiKey = process.env.HOLDED_TEST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'HOLDED_TEST_API_KEY no configurada en el entorno' },
      { status: 500 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  const checks: { name: string; url: string }[] = [
    // Facturas y documentos
    {
      name: 'invoices.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/documents/invoice?limit=5&page=1`,
    },
    {
      name: 'purchases.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/documents/purchase?limit=5&page=1`,
    },
    {
      name: 'estimates.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/documents/estimate?limit=5&page=1`,
    },
    {
      name: 'salesorders.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/documents/salesorder?limit=5&page=1`,
    },
    // Contactos y productos
    { name: 'contacts.list', url: `${HOLDED_BASE}/api/invoicing/v1/contacts?limit=5&page=1` },
    {
      name: 'contact_groups.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/contacts/groups?limit=5&page=1`,
    },
    { name: 'products.list', url: `${HOLDED_BASE}/api/invoicing/v1/products?limit=5&page=1` },
    { name: 'services.list', url: `${HOLDED_BASE}/api/invoicing/v1/services?limit=5&page=1` },
    // Tesorería y pagos
    { name: 'treasury.list', url: `${HOLDED_BASE}/api/invoicing/v1/treasury` },
    { name: 'payments.list', url: `${HOLDED_BASE}/api/invoicing/v1/payments?limit=5&page=1` },
    // Inventario
    { name: 'warehouses.list', url: `${HOLDED_BASE}/api/invoicing/v1/warehouses?limit=5&page=1` },
    {
      name: 'saleschannels.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/saleschannels?limit=5&page=1`,
    },
    {
      name: 'expense_accounts.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/expensesaccounts?limit=5&page=1`,
    },
    // Auxiliares
    { name: 'taxes.list', url: `${HOLDED_BASE}/api/invoicing/v1/taxes` },
    {
      name: 'numbering_invoice.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/numberingseries/invoice`,
    },
    {
      name: 'numbering_estimate.list',
      url: `${HOLDED_BASE}/api/invoicing/v1/numberingseries/estimate`,
    },
    // Contabilidad
    {
      name: 'chart_of_accounts.list',
      url: `${HOLDED_BASE}/api/accounting/v1/chartofaccounts?limit=5&page=1`,
    },
    {
      name: 'daily_ledger.list',
      url: `${HOLDED_BASE}/api/accounting/v1/dailyledger?starttmp=${thirtyDaysAgo}&endtmp=${now}&page=1&limit=5`,
    },
    // CRM
    { name: 'crm_funnels.list', url: `${HOLDED_BASE}/api/crm/v1/funnels` },
    { name: 'crm_bookings.list', url: `${HOLDED_BASE}/api/crm/v1/bookings?limit=5&page=1` },
    // Proyectos y equipo
    { name: 'projects.list', url: `${HOLDED_BASE}/api/projects/v1/projects?limit=5&page=1` },
    { name: 'employees.list', url: `${HOLDED_BASE}/api/team/v1/employees?limit=5&page=1` },
  ];

  const results = await Promise.all(checks.map(({ name, url }) => runCheck(apiKey, name, url)));

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  return NextResponse.json({
    results,
    summary: { passed, failed, total: results.length },
    runAt: new Date().toISOString(),
  } satisfies SmokeTestResponse);
}
