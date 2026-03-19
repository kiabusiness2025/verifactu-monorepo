'use client';

import Link from 'next/link';
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

export default function DashboardPage() {
  const { currentTenant, demoMode, displayName, tenantSlug } = useCurrentTenant();
  const basePath = `/t/${tenantSlug}`;

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
                  <div className="mt-2 text-lg font-semibold">12.450 EUR</div>
                  <div className="mt-1 text-xs text-muted-foreground">Facturacion registrada y lista para seguimiento.</div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">
                    GASTOS DEL MES
                  </div>
                  <div className="mt-2 text-lg font-semibold">4.980 EUR</div>
                  <div className="mt-1 text-xs text-muted-foreground">Gastos visibles para entender el margen real.</div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">
                    BENEFICIO ESTIMADO
                  </div>
                  <div className="mt-2 text-lg font-semibold">7.470 EUR</div>
                  <div className="mt-1 text-xs text-muted-foreground">Ventas menos gastos, sin cruces manuales.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-5">
              <div className="text-xs tracking-widest text-muted-foreground">SIGUIENTE PASO</div>
              <div className="mt-3 text-lg font-semibold text-foreground">
                {demoMode ? 'Empieza por emitir una factura de prueba' : 'Revisa hoy lo pendiente'}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {demoMode
                  ? 'Puedes recorrer el flujo principal sin tocar datos reales y entender rapidamente como funciona el panel.'
                  : 'Tienes a mano las tareas que mas impacto tienen en cobro, control y tranquilidad.'}
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
          value="12.450 EUR"
          hint="Cobro en marcha y actividad estable."
          badge={{ label: 'Sube', tone: 'ok' }}
        />
        <MetricCard
          title="Gastos mes"
          value="4.980 EUR"
          hint="Gastos visibles para no perder margen."
          badge={{ label: 'Revisado', tone: 'info' }}
        />
        <MetricCard
          title="Beneficio"
          value="7.470 EUR"
          hint="Lectura simple: ventas menos gastos."
          badge={{ label: 'Claro', tone: 'ok' }}
        />
        <MetricCard
          title="Pendiente de cobro"
          value="6 facturas"
          hint="Conviene revisar seguimiento este mismo dia."
          badge={{ label: 'Atencion', tone: 'warn' }}
        />
      </div>

      <SectionTitle title="Lo que conviene mirar hoy" />
      <div className="grid gap-3 md:grid-cols-2">
        <NoticeCard
          label="Cobro"
          text="Hay facturas pendientes de seguimiento. Si empiezas por ahi, reduces incertidumbre y mejoras caja antes de tocar otras tareas."
        />
        <NoticeCard
          label="VeriFactu"
          text="Mantener la comunicacion al dia evita revisiones de ultima hora. Puedes entrar y ver el estado general en un solo paso."
        />
        <NoticeCard
          label="Banca"
          text="La conciliacion pendiente suele ser la manera mas rapida de recuperar contexto y limpiar el panel para el resto de la semana."
        />
        <NoticeCard
          label="Isaak"
          text="Si no sabes por donde seguir, Isaak puede orientarte dentro del propio panel sin obligarte a aprender reglas complejas."
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
          title={demoMode ? 'Modo demo activo' : 'Panel listo para trabajar'}
          text={
            demoMode
              ? 'Puedes recorrer el panel completo sin riesgo y entender el flujo antes de usar tus propios datos.'
              : 'Tienes un punto de entrada claro para facturacion, gastos, banca y control diario.'
          }
          tone="info"
        />
      </div>
    </div>
  );
}
