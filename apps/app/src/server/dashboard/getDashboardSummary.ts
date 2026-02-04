import { prisma } from '@verifactu/db';
import { getSessionPayload, requireUserId } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

type DashboardTenant = {
  id: string;
  name: string;
  legalName?: string | null;
  nif?: string | null;
  isDemo: boolean;
};

type DashboardMetrics = {
  sales: number;
  expenses: number;
  profit: number;
  tax: number;
};

type IsaakAction = {
  id: string;
  title: string;
  action: string;
  href: string;
};

export type DashboardSummary = {
  user: {
    id: string;
    name: string;
    email?: string | null;
  };
  tenants: DashboardTenant[];
  activeTenant: DashboardTenant | null;
  activeTenantId: string | null;
  supportMode: boolean;
  supportSessionId: string | null;
  demoMode: boolean;
  metrics: DashboardMetrics;
  actions: IsaakAction[];
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  // Prisma Decimal
  return Number(value);
}

type ActionContext = {
  tenantId: string | null;
  demoMode: boolean;
  invoiceCount: number;
  expenseCount: number;
  vatEstimated: number;
  draftInvoicesCount: number;
  unpaidInvoicesCount: number;
  hasBankIntegration: boolean;
  hasVerifactuIntegration: boolean;
  unprocessedDocsCount: number;
};

function buildActions({
  tenantId,
  demoMode,
  invoiceCount,
  expenseCount,
  vatEstimated,
  draftInvoicesCount,
  unpaidInvoicesCount,
  hasBankIntegration,
  hasVerifactuIntegration,
  unprocessedDocsCount,
}: ActionContext): IsaakAction[] {
  const demoSuffix = demoMode ? ' (demo)' : '';
  if (demoMode || !tenantId) {
    return [
      {
        id: 'invoice',
        title: `Isaak, emite nueva factura venta${demoSuffix}`,
        action: 'Nueva factura Veri*Factu',
        href: '/dashboard/invoices',
      },
      {
        id: 'expense',
        title: `Contabiliza esta factura de gasto${demoSuffix}`,
        action: 'Importar archivo',
        href: '/dashboard/documents',
      },
      {
        id: 'hacienda',
        title: `Interpreta esta notificacion de Hacienda${demoSuffix}`,
        action: 'Subir documentos',
        href: '/dashboard/documents',
      },
    ];
  }

  const actions: IsaakAction[] = [];

  if (!hasVerifactuIntegration) {
    actions.push({
      id: 'verifactu',
      title: `Activar Veri*Factu para este tenant${demoSuffix}`,
      action: 'Activar Veri*Factu',
      href: '/dashboard/settings',
    });
  }

  if (draftInvoicesCount > 0) {
    actions.push({
      id: 'invoice-drafts',
      title: `Revisar borradores de factura (${draftInvoicesCount})${demoSuffix}`,
      action: 'Ver borradores',
      href: '/dashboard/invoices?status=draft',
    });
  } else {
    actions.push({
      id: 'invoice',
      title: `Emitir nueva factura Veri*Factu${demoSuffix}`,
      action: 'Nueva factura',
      href: '/dashboard/invoices/new',
    });
  }

  if (!hasBankIntegration) {
    actions.push({
      id: 'banking-connect',
      title: `Conectar banco para conciliacion automatica${demoSuffix}`,
      action: 'Conectar banco',
      href: '/dashboard/banks',
    });
  } else if (unpaidInvoicesCount > 0) {
    actions.push({
      id: 'banking',
      title: `Conciliar ${unpaidInvoicesCount} movimientos pendientes${demoSuffix}`,
      action: 'Ir a bancos',
      href: '/dashboard/banks',
    });
  }

  if (unprocessedDocsCount > 0) {
    actions.push({
      id: 'documents',
      title: `Clasificar ${unprocessedDocsCount} documentos${demoSuffix}`,
      action: 'Revisar documentos',
      href: '/dashboard/documents?state=pending',
    });
  }

  if (actions.length >= 3) {
    return actions.slice(0, 3);
  }

  return [
    ...actions,
    {
      id: 'invoice',
      title: `Emitir factura Veri*Factu para el ultimo cobro${demoSuffix}`,
      action: 'Nueva factura',
      href: '/dashboard/invoices',
    },
    {
      id: 'documents',
      title: `Guardar documento para tu asesor${demoSuffix}`,
      action: 'Subir documento',
      href: '/dashboard/documents',
    },
  ].slice(0, 3);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const session = await getSessionPayload();
  const uid = requireUserId(session);

  const memberships = await prisma.membership.findMany({
    where: { userId: uid, status: 'active' },
    include: { tenant: true },
    orderBy: { createdAt: 'desc' },
  });

  const tenants: DashboardTenant[] = memberships.map((membership) => ({
    id: membership.tenant.id,
    name: membership.tenant.name,
    legalName: membership.tenant.legalName,
    nif: membership.tenant.nif,
    isDemo: membership.tenant.isDemo,
  }));

  const preference = await prisma.userPreference.findUnique({
    where: { userId: uid },
  });
  const resolved = await resolveActiveTenant({
    userId: uid,
    sessionTenantId: session?.tenantId ?? null,
    tenants,
    defaultTenantId: preference?.preferredTenantId ?? tenants[0]?.id ?? null,
  });

  const activeTenantId = resolved.tenantId;
  const activeTenant = resolved.tenant
    ? {
        id: resolved.tenant.id,
        name: resolved.tenant.name,
        legalName: resolved.tenant.legalName,
        nif: resolved.tenant.nif,
        isDemo: resolved.tenant.isDemo ?? false,
      }
    : tenants.find((tenant) => tenant.id === activeTenantId) ?? null;

  const onboarding = await prisma.userOnboarding.findUnique({
    where: { userId: uid },
    select: { demoTenantId: true },
  });

  const demoMode =
    (onboarding?.demoTenantId ?? null) === activeTenantId || (activeTenant?.isDemo ?? false);

  let metrics: DashboardMetrics = {
    sales: 0,
    expenses: 0,
    profit: 0,
    tax: 0,
  };
  let invoiceCount = 0;
  let expenseCount = 0;
  let draftInvoicesCount = 0;
  let unpaidInvoicesCount = 0;
  let hasVerifactuIntegration = demoMode;
  const hasBankIntegration = false;
  const unprocessedDocsCount = 0;

  if (activeTenantId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [invoiceAgg, expenseAgg, expenseTaxRows, draftCount, unpaidCount, verifactuInvoice] =
      await Promise.all([
        prisma.invoice.aggregate({
          where: {
            tenantId: activeTenantId,
            issueDate: { gte: monthStart, lt: monthEnd },
            status: { not: 'draft' },
          },
          _sum: {
            amountGross: true,
            amountTax: true,
          },
          _count: {
            _all: true,
          },
        }),
        prisma.expenseRecord.aggregate({
          where: {
            tenantId: activeTenantId,
            date: { gte: monthStart, lt: monthEnd },
          },
          _sum: {
            amount: true,
          },
          _count: {
            _all: true,
          },
        }),
        prisma.expenseRecord.findMany({
          where: {
            tenantId: activeTenantId,
            date: { gte: monthStart, lt: monthEnd },
          },
          select: { amount: true, taxRate: true },
        }),
        prisma.invoice.count({
          where: {
            tenantId: activeTenantId,
            status: 'draft',
          },
        }),
        prisma.invoice.count({
          where: {
            tenantId: activeTenantId,
            status: 'issued',
          },
        }),
        prisma.invoice.findFirst({
          where: {
            tenantId: activeTenantId,
            verifactuStatus: { not: null },
          },
          select: { id: true },
        }),
      ]);

    const sales = toNumber(invoiceAgg._sum.amountGross);
    const expenses = toNumber(expenseAgg._sum.amount);
    const invoiceTax = toNumber(invoiceAgg._sum.amountTax);
    const expenseTax = expenseTaxRows.reduce(
      (acc, row) => acc + toNumber(row.amount) * toNumber(row.taxRate),
      0
    );

    invoiceCount = Number(invoiceAgg._count._all ?? 0);
    expenseCount = Number(expenseAgg._count._all ?? 0);
    draftInvoicesCount = Number(draftCount ?? 0);
    unpaidInvoicesCount = Number(unpaidCount ?? 0);
    hasVerifactuIntegration = demoMode || !!verifactuInvoice;

    metrics = {
      sales,
      expenses,
      profit: sales - expenses,
      tax: invoiceTax - expenseTax,
    };
  }

  const userName =
    session?.name || (session?.email ? session.email.split('@')[0] : null) || 'Usuario';

  return {
    user: {
      id: uid,
      name: userName,
      email: session?.email ?? null,
    },
    tenants,
    activeTenant,
    activeTenantId,
    supportMode: resolved.supportMode,
    supportSessionId: resolved.supportSessionId,
    demoMode,
    metrics,
    actions: buildActions({
      tenantId: activeTenantId,
      demoMode,
      invoiceCount,
      expenseCount,
      vatEstimated: metrics.tax,
      draftInvoicesCount,
      unpaidInvoicesCount,
      hasBankIntegration,
      hasVerifactuIntegration,
      unprocessedDocsCount,
    }),
  };
}
