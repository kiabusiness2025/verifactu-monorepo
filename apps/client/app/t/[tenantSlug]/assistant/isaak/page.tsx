'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  Banknote,
  Bot,
  Building2,
  FileText,
  Receipt,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  getIsaakDockCopy,
  getIsaakToneMeta,
  normalizeIsaakTone,
  type IsaakTone,
} from '@verifactu/utils/isaak/persona';
import { useCurrentTenant } from '@/src/tenant/useCurrentTenant';
import { ActionCard, Card, CardContent, NoticeCard, SectionTitle } from '@/src/ui';

const toneMeta = getIsaakToneMeta();

function resolveToneLabel(tone: IsaakTone) {
  return toneMeta[tone].label;
}

export default function IsaakAssistantPage() {
  const { currentTenant, tenantSlug, demoMode, displayName } = useCurrentTenant();
  const [tone, setTone] = React.useState<IsaakTone>('friendly');
  const basePath = `/t/${tenantSlug}`;

  React.useEffect(() => {
    let cancelled = false;

    async function loadTone() {
      try {
        const response = await fetch(
          `/api/preferences?tenantId=${encodeURIComponent(currentTenant.id)}`,
          { cache: 'no-store', credentials: 'include' }
        );
        const data = (await response.json().catch(() => null)) as { isaak_tone?: string } | null;

        if (!cancelled && data?.isaak_tone) {
          setTone(normalizeIsaakTone(data.isaak_tone));
        }
      } catch {
        if (!cancelled) {
          setTone(normalizeIsaakTone());
        }
      }
    }

    if (currentTenant.id) {
      void loadTone();
    }

    return () => {
      cancelled = true;
    };
  }, [currentTenant.id]);

  const dashboardGuide = getIsaakDockCopy({ moduleKey: 'dashboard', context: 'dashboard', tone });
  const invoiceGuide = getIsaakDockCopy({ moduleKey: 'invoices', context: 'dashboard', tone });
  const customerGuide = getIsaakDockCopy({ moduleKey: 'customers', context: 'dashboard', tone });
  const bankingGuide = getIsaakDockCopy({ moduleKey: 'banking', context: 'dashboard', tone });

  const actionCards = [
    {
      title: 'Analizar facturas',
      subtitle: 'Ve directo a emisión, cobros pendientes y seguimiento de clientes.',
      tag: 'Facturacion',
      href: `${basePath}/erp/invoices`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: 'Revisar gastos',
      subtitle: 'Ordena tickets y vigila lo que impacta el beneficio del mes.',
      tag: 'Gastos',
      href: `${basePath}/erp/expenses`,
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      title: 'Consultar clientes',
      subtitle: 'Detecta a quién conviene reactivar o hacer seguimiento hoy.',
      tag: 'Clientes',
      href: `${basePath}/erp/customers`,
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      title: 'Mirar bancos',
      subtitle: 'Empieza por movimientos críticos y conciliación con menos fricción.',
      tag: 'Banca',
      href: `${basePath}/banking/reconciliation`,
      icon: <Banknote className="h-4 w-4" />,
    },
    {
      title: 'Ajustar configuración',
      subtitle: 'Afina notificaciones, perfil fiscal y prioridades operativas.',
      tag: 'Configuracion',
      href: `${basePath}/settings/profile`,
      icon: <Settings2 className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] xl:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
                <Bot className="h-3.5 w-3.5" />
                Isaak activo en tu entorno cliente
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {demoMode ? 'Prueba cómo piensa Isaak antes de operar en real.' : `Isaak ya puede orientarte dentro de ${currentTenant.name}.`}
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Isaak no sustituye tu panel: lo traduce. Resume actividad, prioriza riesgos y te acerca el siguiente paso útil sin obligarte a pensar como contable.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">PERSONALIDAD ACTIVA</div>
                  <div className="mt-2 text-lg font-semibold">{resolveToneLabel(tone)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{toneMeta[tone].preview}</div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">USUARIO</div>
                  <div className="mt-2 text-lg font-semibold">{displayName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Mismo criterio de voz en cliente, app principal y entorno Holded.</div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-[11px] tracking-widest text-muted-foreground">SIGUIENTE PASO</div>
                  <div className="mt-2 text-lg font-semibold">Empieza por un área concreta</div>
                  <div className="mt-1 text-xs text-muted-foreground">Facturas, clientes, bancos o configuración. Isaak se adapta al módulo desde el que trabajas.</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`${basePath}/dashboard`}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95"
                >
                  Volver al panel
                </Link>
                <Link
                  href={`${basePath}/erp/invoices`}
                  className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40"
                >
                  Empezar por facturas
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-5">
              <div className="text-xs tracking-widest text-muted-foreground">COMO PIENSA ISAak HOY</div>
              <div className="mt-3 text-lg font-semibold text-foreground">{dashboardGuide.greeting}</div>
              <p className="mt-2 text-sm text-muted-foreground">Lo importante no es solo responder preguntas. Isaak ordena el trabajo y reduce fricción operativa módulo a módulo.</p>

              <div className="mt-4 space-y-3 text-sm">
                {dashboardGuide.suggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-xl border p-3">
                    <div className="font-medium text-foreground">{suggestion}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{dashboardGuide.quickResult}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle title="Playbooks de Isaak" />
      <div className="grid gap-4 xl:grid-cols-4">
        <NoticeCard label="Dashboard" text={`${dashboardGuide.suggestions[0]}. ${dashboardGuide.quickResult}`} />
        <NoticeCard label="Facturas" text={`${invoiceGuide.suggestions[0]}. ${invoiceGuide.quickResult}`} />
        <NoticeCard label="Clientes" text={`${customerGuide.suggestions[0]}. ${customerGuide.quickResult}`} />
        <NoticeCard label="Bancos" text={`${bankingGuide.suggestions[0]}. ${bankingGuide.quickResult}`} />
      </div>

      <SectionTitle title="Trabajar con Isaak" />
      <div className="grid gap-4 xl:grid-cols-3">
        <NoticeCard
          label="1. Resume"
          text="Empieza por el estado del negocio: ventas, gastos, cobros pendientes y señales que requieren atención hoy."
        />
        <NoticeCard
          label="2. Prioriza"
          text="Después baja a un módulo concreto y deja que Isaak te ordene qué revisar primero y qué puede esperar."
        />
        <NoticeCard
          label="3. Actúa"
          text="Usa el panel para ejecutar el siguiente paso con más contexto y menos fricción operativa."
        />
      </div>

      <SectionTitle title="Entradas rápidas" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actionCards.map((item) => (
          <ActionCard
            key={item.href}
            title={item.title}
            subtitle={item.subtitle}
            tag={item.tag}
            href={item.href}
            icon={item.icon}
          />
        ))}
        <ActionCard
          title="Abrir el dock contextual"
          subtitle="Desde cualquier pantalla puedes abrir Isaak y mantener el contexto del módulo actual."
          tag="Asistente"
          href={`${basePath}/dashboard`}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
