'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  Banknote,
  Building2,
  FileText,
  Inbox,
  LineChart,
  Mail,
  Receipt,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCurrentTenant } from '../../../../src/tenant/useCurrentTenant';
import {
  ActionCard,
  Card,
  CardContent,
  MetricCard,
  NoticeCard,
  SectionTitle,
  ToastCard,
} from '../../../../src/ui';

type DashboardSummary = {
  salesMonth: number;
  expensesMonth: number;
  profitMonth: number;
  invoiceCountMonth: number;
  expenseCountMonth: number;
  draftInvoicesCount: number;
  pendingInvoicesCount: number;
  verifactuPendingCount: number;
  expenseReviewCount: number;
  customerCount: number;
};

function getGreetingLabel() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Buenos días';
  }

  if (hour < 20) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function getNextStep(summary: DashboardSummary | null, demoMode: boolean) {
  if (!summary) {
    return {
      title: demoMode ? 'Preparando tu resumen' : 'Cargando actividad reciente',
      description: 'En cuanto tengamos los datos, priorizamos el siguiente paso mas util para hoy.',
    };
  }

  if (summary.pendingInvoicesCount > 0) {
    return {
      title: 'Empieza por el cobro pendiente',
      description: `Tienes ${summary.pendingInvoicesCount} factura${summary.pendingInvoicesCount === 1 ? '' : 's'} emitida${summary.pendingInvoicesCount === 1 ? '' : 's'} que conviene revisar antes que nada.`,
    };
  }

  if (summary.expenseReviewCount > 0) {
    return {
      title: 'Revisa los gastos sin confirmar',
      description: `Hay ${summary.expenseReviewCount} gasto${summary.expenseReviewCount === 1 ? '' : 's'} pendiente${summary.expenseReviewCount === 1 ? '' : 's'} de confirmacion o clasificacion.`,
    };
  }

  if (summary.verifactuPendingCount > 0) {
    return {
      title: 'Comprueba el estado de VeriFactu',
      description: `Hay ${summary.verifactuPendingCount} factura${summary.verifactuPendingCount === 1 ? '' : 's'} que todavia requieren seguimiento en cumplimiento.`,
    };
  }

  return {
    title: demoMode ? 'Empieza emitiendo una factura de prueba' : 'Panel en orden para hoy',
    description: demoMode
      ? 'Puedes probar el flujo principal sin tocar datos reales y entender el panel con calma.'
      : 'No hay bloqueos inmediatos. Puedes avanzar en facturacion, gastos o clientes segun prioridad.',
  };
}

export default function DashboardPage() {
  const { currentTenant, demoMode, displayName, tenantSlug } = useCurrentTenant();
  const basePath = `/t/${tenantSlug}`;
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setSummaryError(null);
        const response = await fetch(
          `/api/dashboard/summary?tenantId=${encodeURIComponent(currentTenant.id)}`,
          { cache: 'no-store' }
        );
        const payload = (await response.json().catch(() => null)) as
          | { ok: boolean; summary?: DashboardSummary; error?: string }
          | null;

        if (!response.ok || !payload?.ok || !payload.summary) {
          throw new Error(payload?.error ?? 'No se pudo cargar el dashboard');
        }

        if (!cancelled) {
          setSummary(payload.summary);
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryError(error instanceof Error ? error.message : 'No se pudo cargar el dashboard');
        }
      }
    }

    if (currentTenant.id) {
      loadSummary();
    }

    return () => {
      cancelled = true;
    };
  }, [currentTenant.id]);

  const resolvedSummary = summary ?? {
    salesMonth: 0,
    expensesMonth: 0,
    profitMonth: 0,
    invoiceCountMonth: 0,
    expenseCountMonth: 0,
    draftInvoicesCount: 0,
    pendingInvoicesCount: 0,
    verifactuPendingCount: 0,
    expenseReviewCount: 0,
    customerCount: 0,
  };
  const nextStep = getNextStep(summary, demoMode);

  const quickActions = [
    {
      title: 'Emitir factura',
      subtitle: 'Crear una nueva factura y dejarla preparada para enviar.',
      tag: 'Facturacion',
      href: `${basePath}/erp/invoices/new`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: 'Registrar gasto',
      subtitle: 'Añade un gasto para mantener el beneficio al dia.',
      tag: 'Gastos',
      href: `${basePath}/erp/expenses/new`,
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      title: 'Conciliar banco',
      subtitle: 'Revisa movimientos pendientes y ordénalos sin fricción.',
      tag: 'Banca',
      href: `${basePath}/banking/reconciliation`,
      icon: <Banknote className="h-4 w-4" />,
    },
    {
      title: 'Ver clientes',
      subtitle: 'Consulta el estado comercial de tus clientes.',
      tag: 'Clientes',
      href: `${basePath}/erp/customers`,
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      title: 'Abrir Isaak',
      subtitle: 'Pide ayuda para resolver dudas sin entrar en tecnicismos.',
      tag: 'Isaak',
      href: `${basePath}/assistant/isaak`,
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      title: 'Estado VeriFactu',
      subtitle: 'Comprueba si hay algo pendiente antes de que preocupe.',
      tag: 'Control',
      href: `${basePath}/compliance/verifactu`,
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] xl:items-start">
            <div>
              <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
                Panel de cliente
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {getGreetingLabel()}, {displayName}
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Aqui tienes una vista clara de {currentTenant.name}: ventas, gastos y beneficio,
                con accesos rapidos para avanzar sin perder tiempo.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">
                    VENTAS DEL MES
                  </div>
                  <div className="mt-2 text-lg font-semibold">{formatCurrency(resolvedSummary.salesMonth)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {resolvedSummary.invoiceCountMonth} factura{resolvedSummary.invoiceCountMonth === 1 ? '' : 's'} registradas este mes.
                  </div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">
                    GASTOS DEL MES
                  </div>
                  <div className="mt-2 text-lg font-semibold">{formatCurrency(resolvedSummary.expensesMonth)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {resolvedSummary.expenseCountMonth} gasto{resolvedSummary.expenseCountMonth === 1 ? '' : 's'} contabilizados este mes.
                  </div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">
                    BENEFICIO ESTIMADO
                  </div>
                  <div className="mt-2 text-lg font-semibold">{formatCurrency(resolvedSummary.profitMonth)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Ventas menos gastos, segun actividad real del mes.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-5">
              <div className="text-xs tracking-widest text-muted-foreground">SIGUIENTE PASO</div>
              <div className="mt-3 text-lg font-semibold text-foreground">
                {nextStep.title}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {nextStep.description}
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <FileText className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Facturas</div>
                    <div className="text-muted-foreground">Prepara una nueva factura o revisa las pendientes de cobro.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <Receipt className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Gastos</div>
                    <div className="text-muted-foreground">Mantén el beneficio actualizado registrando los ultimos gastos.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Control</div>
                    <div className="text-muted-foreground">Comprueba si hay algo que revisar en cumplimiento antes de que escale.</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`${basePath}/erp/invoices/new`}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Crear factura
                </Link>
                <Link
                  href={`${basePath}/erp/expenses/new`}
                  className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
                >
                  Registrar gasto
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle title="Acciones clave" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => (
          <ActionCard
            key={action.title}
            title={action.title}
            subtitle={action.subtitle}
            tag={action.tag}
            href={action.href}
            icon={action.icon}
          />
        ))}
      </div>

      <SectionTitle title="Control del negocio" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ventas mes"
          value={formatCurrency(resolvedSummary.salesMonth)}
          hint={`${resolvedSummary.invoiceCountMonth} factura${resolvedSummary.invoiceCountMonth === 1 ? '' : 's'} con impacto en este mes.`}
          badge={{ label: resolvedSummary.salesMonth > 0 ? 'Activo' : 'Sin movimiento', tone: resolvedSummary.salesMonth > 0 ? 'ok' : 'info' }}
        />
        <MetricCard
          title="Gastos mes"
          value={formatCurrency(resolvedSummary.expensesMonth)}
          hint={`${resolvedSummary.expenseCountMonth} gasto${resolvedSummary.expenseCountMonth === 1 ? '' : 's'} registrados este mes.`}
          badge={{ label: resolvedSummary.expenseReviewCount > 0 ? 'Revisar' : 'Al dia', tone: resolvedSummary.expenseReviewCount > 0 ? 'warn' : 'info' }}
        />
        <MetricCard
          title="Beneficio"
          value={formatCurrency(resolvedSummary.profitMonth)}
          hint="Lectura simple: ventas menos gastos."
          badge={{ label: resolvedSummary.profitMonth >= 0 ? 'Positivo' : 'Vigilar', tone: resolvedSummary.profitMonth >= 0 ? 'ok' : 'warn' }}
        />
        <MetricCard
          title="Pendiente de cobro"
          value={`${resolvedSummary.pendingInvoicesCount} factura${resolvedSummary.pendingInvoicesCount === 1 ? '' : 's'}`}
          hint="Conviene revisar seguimiento y cobro hoy."
          badge={{ label: resolvedSummary.pendingInvoicesCount > 0 ? 'Atencion' : 'OK', tone: resolvedSummary.pendingInvoicesCount > 0 ? 'warn' : 'ok' }}
        />
      </div>

      <SectionTitle title="Lo que conviene mirar hoy" />
      <div className="grid gap-3 md:grid-cols-2">
        <NoticeCard
          label="Cobro"
          text={
            resolvedSummary.pendingInvoicesCount > 0
              ? `Hay ${resolvedSummary.pendingInvoicesCount} factura${resolvedSummary.pendingInvoicesCount === 1 ? '' : 's'} pendiente${resolvedSummary.pendingInvoicesCount === 1 ? '' : 's'} de cobro o seguimiento. Empezar por ahi reduce incertidumbre de caja.`
              : 'No hay facturas pendientes de cobro ahora mismo. Puedes dedicar el tiempo a emitir, registrar gastos o revisar clientes.'
          }
        />
        <NoticeCard
          label="VeriFactu"
          text={
            resolvedSummary.verifactuPendingCount > 0
              ? `Hay ${resolvedSummary.verifactuPendingCount} factura${resolvedSummary.verifactuPendingCount === 1 ? '' : 's'} con envio o revision pendiente. Tenerlo al dia evita urgencias de ultima hora.`
              : 'No hay avisos inmediatos de VeriFactu en este tenant. El estado general esta tranquilo.'
          }
        />
        <NoticeCard
          label="Gastos"
          text={
            resolvedSummary.expenseReviewCount > 0
              ? `Hay ${resolvedSummary.expenseReviewCount} gasto${resolvedSummary.expenseReviewCount === 1 ? '' : 's'} sin confirmar. Revisarlos ayuda a que el beneficio refleje la situacion real.`
              : 'Los gastos no muestran revisiones pendientes ahora mismo. El margen mensual esta mas claro.'
          }
        />
        <NoticeCard
          label="Clientes"
          text={
            resolvedSummary.customerCount > 0
              ? `Trabajas con ${resolvedSummary.customerCount} cliente${resolvedSummary.customerCount === 1 ? '' : 's'} activo${resolvedSummary.customerCount === 1 ? '' : 's'}. Tener clara su actividad ayuda a priorizar mejor el cobro y la facturacion.`
              : 'Todavia no hay clientes activos registrados en este tenant. Ese puede ser un buen siguiente paso si vas a empezar a facturar.'
          }
        />
      </div>

      <SectionTitle title="Accesos rapidos" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          title="Buzon de correos"
          subtitle="Consulta mensajes salientes y su seguimiento." 
          tag="Email"
          href={`${basePath}/emails/outbox`}
          icon={<Mail className="h-4 w-4" />}
        />
        <ActionCard
          title="Resumen comercial"
          subtitle="Consulta clientes y actividad comercial visible." 
          tag="Clientes"
          href={`${basePath}/erp/customers`}
          icon={<Inbox className="h-4 w-4" />}
        />
        <ActionCard
          title="Configurar empresa"
          subtitle="Actualiza datos basicos e informacion de la cuenta." 
          tag="Ajustes"
          href={`${basePath}/settings/company`}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      <div className="flex justify-end">
        <ToastCard
          title={summaryError ? 'Resumen no disponible' : demoMode ? 'Modo demo activo' : 'Panel listo para trabajar'}
          text={
            summaryError
              ? 'No hemos podido cargar el resumen en tiempo real. El resto del panel sigue disponible.'
              : demoMode
              ? 'Puedes recorrer el panel completo sin riesgo y entender el flujo antes de usar tus propios datos.'
              : 'Tienes un punto de entrada claro para facturacion, gastos, banca y control diario.'
          }
          tone={summaryError ? 'warn' : 'info'}
        />
      </div>
    </div>
  );
}
