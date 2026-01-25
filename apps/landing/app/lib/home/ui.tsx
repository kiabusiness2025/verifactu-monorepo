import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Percent,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Wallet,
} from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';
import type { IsaakMsg } from './types';
import { getAppUrl } from '../urls';
import { Button } from '../../components/ui';

export function Container({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PrimaryButton({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button variant="primary" size="md" className={className}>
      {children}
    </Button>
  );
}

export function SecondaryButton({
  className = '',
  children,
  href,
}: {
  className?: string;
  children: React.ReactNode;
  href?: string;
}) {
  if (href) {
    return (
      <Link href={href} className={className}>
        <Button variant="secondary" size="md" className={className}>
          {children}
        </Button>
      </Link>
    );
  }

  return (
    <Button variant="secondary" size="md" type="button" className={className}>
      {children}
    </Button>
  );
}

export function StickyCtaBar({ show }: { show: boolean }) {
  const appDemoUrl = `${getAppUrl()}/demo`;
  return (
    <div
      className={`fixed inset-x-0 bottom-4 z-30 px-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm font-semibold text-[#2361d8]">
          Prueba gratis y ve a Isaak en accion
        </div>
        <div className="flex gap-2">
          <Link href="/auth/signup">
            <PrimaryButton className="h-10 px-4 text-sm">Probar gratis</PrimaryButton>
          </Link>
          <SecondaryButton href={appDemoUrl} className="h-10 px-4 text-sm">
            Ver demo
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

export function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
      {icon}
      <span>{text}</span>
    </div>
  );
}

export function CommandExample({ command, response }: { command: string; response: string }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white ring-4 ring-slate-100">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-500">Tu comando</div>
          <p className="mt-1.5 text-sm font-medium leading-6 text-slate-900">{command}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200/50">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2361d8]">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="text-xs font-semibold text-[#2361d8]">Respuesta de Isaak</div>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{response}</p>
      </div>
    </div>
  );
}

export function HeroMockup({
  visibleMsgs,
  benefitValue,
}: {
  visibleMsgs: IsaakMsg[];
  benefitValue: number;
}) {
  const formattedBenefit = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(benefitValue);

  const heroLog = [
    { title: 'Factura VF-2031', desc: 'Validada y enviada al cliente' },
    { title: 'Ticket combustible', desc: 'Marcado deducible y registrado' },
    { title: 'Sync VeriFactu', desc: 'Ultima validacion hace 3 min' },
  ];

  return (
    <div className="relative">
      <div className="absolute -right-6 top-10 hidden h-40 w-40 rounded-full bg-[#2361d8]/10 blur-3xl lg:block" />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <Sparkles className="h-4 w-4 text-[#2361d8]" />
            Isaak
          </div>
          <button className="text-xs font-medium text-[#2361d8] hover:text-[#2361d8]">
            Conectar
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">Estado diario del negocio</div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {visibleMsgs.map((m, idx) => (
                <motion.div
                  key={`${m.title}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="mt-0.5">
                    <MsgDot type={m.type} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{m.title}</div>
                    <div className="mt-0.5 text-xs leading-5 text-slate-600">{m.body}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MiniStat
            title="Resumen"
            value={formattedBenefit}
            sub="Beneficio estimado"
            badge="Completo"
          />
          <MiniInvoice />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">Registro reciente</div>
          <div className="space-y-2">
            {heroLog.map((item) => (
              <div
                key={item.title}
                className="flex justify-between rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200"
              >
                <span className="font-semibold text-slate-800">{item.title}</span>
                <span className="text-slate-500">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MsgDot({ type }: { type: IsaakMsg['type'] }) {
  const cls = type === 'ok' ? 'bg-emerald-500' : type === 'warn' ? 'bg-amber-500' : 'bg-[#2361d8]';
  return <div className={`h-3.5 w-3.5 rounded-full ${cls}`} />;
}

export function MiniStat({
  title,
  value,
  sub,
  badge,
}: {
  title: string;
  value: string;
  sub: string;
  badge: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          {badge}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

export function MiniInvoice() {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">Factura VF-2031</div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
          Pagada
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <div className="text-[11px] text-slate-500">Cliente</div>
          <div className="mt-0.5 font-semibold text-slate-800">A. Lopez</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <div className="text-[11px] text-slate-500">Importe</div>
          <div className="mt-0.5 font-semibold text-slate-800">1.250,00 EUR</div>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
        <CheckCircle2 className="h-4 w-4" />
        Validado por Isaak
      </div>
    </div>
  );
}

export function Stat({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <div>
        <div className="text-lg font-semibold text-[#2361d8]">{label}</div>
        <div className="text-xs font-semibold text-slate-800">{value}</div>
      </div>
      <div className="text-right text-xs text-slate-500">{desc}</div>
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  bullets,
}: {
  icon: React.ReactNode;
  title: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2361d8] hover:text-[#2361d8]">
        Ver mas <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StepCard({
  n,
  title,
  desc,
  icon,
}: {
  n: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
          {n}
        </div>
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
    </div>
  );
}

export function DashboardMock() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2361d8]/10 text-sm font-semibold text-[#2361d8]">
            V
          </div>
          <div>
            <div className="text-sm font-semibold text-[#2361d8]">Verifactu Business</div>
            <div className="text-[11px] text-slate-500">Empresa Demo SL</div>
          </div>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
          Buenas tardes, Maria
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold text-slate-700">Resumen general</div>
        <p className="mt-1 text-xs text-slate-600">
          Beneficio actualizado: ventas - gastos. Sin cruzar hojas.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <KpiCard label="Ventas mes" value="18.420 EUR" sub="+9%" />
          <KpiCard label="Gastos mes" value="11.260 EUR" sub="+5%" />
          <KpiCard label="Beneficio" value="7.160 EUR" sub="+12%" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-700">Acciones</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-[#2361d8]" />
              Factura
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Crea o revisa cobros</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <UploadCloud className="h-4 w-4 text-emerald-600" />
              Documento
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Sube y organiza</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Calendario
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Plazos fiscales</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-700">Isaak</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Maria, enero 2026 va bien. Te faltan 2 tickets y un extracto. ??
          </p>
          <div className="mt-3 flex gap-2">
            <button className="rounded-full bg-[#2361d8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f55c0]">
              Ver resumen
            </button>
            <button className="rounded-full border border-[#2361d8] bg-white px-4 py-2 text-xs font-semibold text-[#2361d8] hover:bg-[#2361d8]/10">
              Recordar luego
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-700">Avisos</div>
          <div className="mt-3 space-y-2">
            <ActivityItem
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              text="Cierre 2025: checklist al 90%"
            />
            <ActivityItem
              icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
              text="T1 2026: plazos en 12 dias"
            />
            <ActivityItem
              icon={<FileText className="h-4 w-4 text-[#2361d8]" />}
              text="Factura VF-2310 validada"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroTripleMock() {
  const [activeId, setActiveId] = React.useState<'resumen' | 'facturas' | 'isaak'>('resumen');
  const [qaIndex, setQaIndex] = React.useState(0);
  React.useEffect(() => {
    const order: Array<typeof activeId> = ['resumen', 'facturas', 'isaak'];
    const interval = setInterval(() => {
      setActiveId((prev) => {
        const idx = order.indexOf(prev);
        return order[(idx + 1) % order.length];
      });
    }, 4200);
    return () => clearInterval(interval);
  }, []);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setQaIndex((prev) => (prev + 1) % 3);
    }, 5200);
    return () => clearInterval(interval);
  }, []);

  const positions = {
    resumen:
      'sm:translate-x-[-150px] sm:translate-y-[-360px] lg:translate-x-[-170px] lg:translate-y-[-400px]',
    facturas:
      'sm:translate-x-[140px] sm:translate-y-[-330px] lg:translate-x-[170px] lg:translate-y-[-360px]',
    isaak:
      'sm:translate-x-[-10px] sm:translate-y-[-70px] lg:translate-x-[-20px] lg:translate-y-[-40px]',
  } as const;

  const panels = [
    {
      id: 'resumen' as const,
      title: 'Resumen general',
      desc: 'Ventas, gastos y beneficio en un vistazo.',
      content: (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Ventas mes" value="18.420 EUR" sub="+9%" />
            <KpiCard label="Gastos mes" value="11.260 EUR" sub="+5%" />
            <KpiCard label="Beneficio" value="7.160 EUR" sub="+12%" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700">Ultimo cierre</div>
              <div className="mt-2 text-sm text-slate-600">Diciembre 2025: margen 31%</div>
              <div className="mt-2 text-xs text-slate-500">Checklist completado al 90%</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-700">Avisos de calendario</div>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>Modelo IVA T1 2026: 12 dias</li>
                <li>Conciliacion bancaria: pendiente</li>
                <li>Recordatorio: subir 2 tickets</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'facturas' as const,
      title: 'Facturas verificadas',
      desc: 'Estado VeriFactu con QR y huella.',
      content: (
        <div className="mt-4 space-y-3 text-xs text-slate-600">
          {[
            {
              number: 'VF-2026-0132',
              client: 'Nova Retail',
              amount: '1.240 EUR',
              status: 'Validado AEAT',
            },
            { number: 'VF-2026-0133', client: 'Luna Tech', amount: '980 EUR', status: 'Enviado' },
            {
              number: 'VF-2026-0134',
              client: 'Eco Servicios',
              amount: '410 EUR',
              status: 'Pendiente',
            },
          ].map((row) => (
            <div
              key={row.number}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <div>
                <div className="text-[11px] font-semibold text-slate-800">{row.number}</div>
                <div className="text-[11px] text-slate-500">{row.client}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-800">{row.amount}</div>
                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {row.status}
                </span>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
            Estado VeriFactu visible en cada factura.
          </div>
        </div>
      ),
    },
    {
      id: 'isaak' as const,
      title: 'Isaak en vivo',
      desc: 'Respuestas inmediatas y accionables.',
      content: (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs font-semibold text-slate-700">Chat con Isaak</div>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>
          {(() => {
            const items = [
              {
                q: 'Isaak, resumen rapido de enero 2026',
                a: 'Vamos genial ?? Ventas 12.480 EUR, gastos 7.130 EUR. Beneficio 5.350 EUR.',
                hint: '¿Quieres ver el detalle por cliente? ?',
                tone: 'emerald',
              },
              {
                q: 'Que falta para cierre 2025?',
                a: 'Te faltan 2 facturas y un extracto ????. ¿Te lo recuerdo hoy?',
                hint: 'Te preparo checklist con un clic ?',
                tone: 'amber',
              },
              {
                q: 'Tengo facturas verificadas?',
                a: 'Sí ?? 9 facturas con QR y huella hash listos.',
                hint: '¿Compartimos el informe con tu gestor? ??',
                tone: 'emerald',
              },
            ];
            const item = items[qaIndex];
            const base =
              item.tone === 'amber'
                ? 'bg-amber-50 ring-amber-100 text-amber-700'
                : 'bg-emerald-50 ring-emerald-100 text-emerald-700';
            return (
              <div className="transition-all duration-500">
                <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500">Tu</div>
                  <div className="mt-1 text-[13px] text-slate-800">{item.q}</div>
                </div>
                <div className={'mt-2 rounded-2xl p-2 ring-1 ' + base}>
                  <div className="text-[11px] font-semibold">Isaak</div>
                  <div className="mt-1 text-[13px] text-slate-700">{item.a}</div>
                  <div className="mt-1 text-[11px]">{item.hint}</div>
                </div>
              </div>
            );
          })()}
        </div>
      ),
    },
  ];

  const getCardClass = (id: typeof activeId) => {
    const isActive = id === activeId;
    const mobileVisibility = isActive ? 'block' : 'hidden sm:block';
    return `${mobileVisibility} relative mx-auto w-full max-w-[360px] rounded-3xl border border-slate-200 bg-white p-3 shadow-xl transition-all duration-500 sm:absolute sm:left-1/2 sm:top-1/2 sm:origin-top-left sm:max-w-none sm:p-4 ${positions[id]} ${
      isActive ? 'z-30 scale-105 opacity-100' : 'z-10 scale-95 opacity-90'
    }`;
  };

  return (
    <div className="relative">
      <div className="relative space-y-4 pb-6 sm:min-h-[520px] sm:space-y-0 sm:pb-0 lg:min-h-[560px]">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => setActiveId(panel.id)}
            className={`${getCardClass(panel.id)} sm:w-[300px] lg:w-[340px]`}
            aria-pressed={activeId === panel.id}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-700">{panel.title}</div>
                <p className="mt-1 text-xs text-slate-500">{panel.desc}</p>
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
            </div>
            {panel.content}
          </button>
        ))}
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

export function ActivityItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      {icon}
      <span className="text-xs text-slate-700">{text}</span>
    </div>
  );
}

export function InfoPill({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

export function ResourceCard({
  tag,
  title,
  desc,
  cta,
}: {
  tag: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
        {tag}
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
      <button className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#2361d8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f55c0]">
        {cta} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="relative bg-[#2361d8] text-slate-100" role="contentinfo">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <Container className="py-12 relative z-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <BrandLogo variant="footer" />
            <p className="mt-3 text-sm text-slate-300">
              Automatiza tu facturacion con cumplimiento y control total.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="/recursos/guias-y-webinars"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7" />
                </svg>
              </a>
              <a
                href="/recursos/blog"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </a>
              <a
                href="/recursos/contacto"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          <FooterCol
            title="Producto"
            links={[
              { label: 'Resumen', href: '#hero' },
              { label: 'Dashboard', href: '#dashboard' },
              { label: 'Features', href: '#features' },
              { label: 'FAQ', href: '#faq' },
              { label: 'Precios', href: '#precios' },
            ]}
          />
          <FooterCol
            title="VeriFactu"
            links={[
              { label: 'Que es', href: '/verifactu/que-es' },
              { label: 'Calcula precio', href: '/#precios' },
              { label: 'Soporte', href: '/verifactu/soporte' },
              { label: 'Estado del servicio', href: '/verifactu/estado' },
            ]}
          />
          <FooterCol
            title="Recursos"
            links={[
              { label: 'Guías y webinars', href: '/recursos/guias-y-webinars' },
              { label: 'Checklist', href: '/recursos/checklist' },
              { label: 'Blog', href: '/recursos/blog' },
              { label: 'Contacto', href: '/recursos/contacto' },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: 'VeriFactu', href: '/verifactu' },
              { label: 'Política de privacidad', href: '/legal/privacidad' },
              { label: 'Terminos de servicio', href: '/legal/terminos' },
              { label: 'Cookies', href: '/legal/cookies' },
            ]}
          />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>(c) {new Date().getFullYear()} Verifactu Business. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <Link
                href="/verifactu"
                className="hover:text-blue-300 transition"
                aria-label="Ir a VeriFactu"
              >
                VeriFactu
              </Link>
              <Link
                href="/legal/privacidad"
                className="hover:text-blue-300 transition"
                aria-label="Leer politica de privacidad"
              >
                Política de privacidad
              </Link>
              <Link
                href="/legal/terminos"
                className="hover:text-blue-300 transition"
                aria-label="Leer terminos de servicio"
              >
                Terminos de servicio
              </Link>
              <Link
                href="/legal/cookies"
                className="hover:text-blue-300 transition"
                aria-label="Leer politica de cookies"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}

type FooterLink = { label: string; href: string };

export function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              className="hover:text-blue-300 transition"
              href={link.href}
              aria-label={`Ir a ${link.label}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PriceDisplay({ price, isYearly }: { price: number | null; isYearly: boolean }) {
  if (price === null) {
    return (
      <div>
        <div className="text-2xl font-bold text-slate-900">Personalizado</div>
        <div className="text-sm text-slate-500">A medida</div>
      </div>
    );
  }
  if (price === 0) {
    return (
      <div>
        <div className="text-4xl font-bold text-slate-900">Gratis</div>
        <div className="text-sm text-slate-500">Siempre</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-4xl font-bold text-slate-900">{price} EUR</div>
      <div className="text-sm text-slate-500">{isYearly ? '/año' : '/mes'}</div>
    </div>
  );
}

export function ComplianceBadge() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mx-auto flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[280px]">
          <Image
            src="/brand/logo-aeat-verifactu.jpg"
            alt="VeriFactu - Agencia Tributaria"
            width={280}
            height={100}
            className="w-full h-auto"
            priority
          />
        </div>
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 ring-1 ring-green-200">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <BadgeCheck className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-green-700">Cumplimiento Certificado</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Sistema homologado según normativa de la Agencia Tributaria
          </p>
        </div>
      </div>
    </div>
  );
}

export function ThreeSteps() {
  return (
    <section className="py-16 bg-[#2361d8]/5">
      <Container>
        <h3 className="text-center text-2xl font-semibold tracking-tight text-[#011c67] sm:text-3xl">
          Del envio al cobro en tres pasos.
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-lightbg-600 sm:text-base">
          Conecta tu flujo de facturacion y deja que Isaak automatice validaciones y recordatorios.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StepCard
            n={1}
            title="Configura Isaak"
            desc="Define tus datos, series y reglas. Conecta Drive y calendario para automatizar el orden."
            icon={<LayoutDashboard className="h-5 w-5 text-[#2361d8]" />}
          />
          <StepCard
            n={2}
            title="Emite y valida"
            desc="Genera la factura y valida automaticamente con VeriFactu antes de enviarla."
            icon={<FileText className="h-5 w-5 text-[#2361d8]" />}
          />
          <StepCard
            n={3}
            title="Cobra y analiza"
            desc="Isaak monitoriza el ciclo, detecta incidencias y te resume impacto en margen."
            icon={<Wallet className="h-5 w-5 text-[#2361d8]" />}
          />
        </div>
      </Container>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="py-16">
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
          Lo que ves es lo que tienes: Ventas, Gastos, Beneficio.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-lightbg-600 sm:text-lg">
          El dashboard muestra solo lo esencial. Isaak entiende documentos, detecta el idioma y te
          guía con alertas y recordatorios cuando se acercan cierres y plazos fiscales.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5 text-[#2361d8]" />}
            title="Emisión sin fricción"
            bullets={[
              'Sube facturas y tickets en cualquier idioma',
              'Isaak interpreta y clasifica al instante',
              'Validacion VeriFactu incluida',
            ]}
          />
          <FeatureCard
            icon={<BadgeCheck className="h-5 w-5 text-[#2361d8]" />}
            title="Gastos guiados"
            bullets={[
              'Documentos, extractos y justificantes',
              'Deducible según tu actividad',
              'Recordatorios de cierres y plazos',
            ]}
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-[#2361d8]" />}
            title="Dashboard claro"
            bullets={[
              'Ventas, gastos y beneficio en tiempo real',
              'Comparativas por mes y trimestre',
              'Alertas cuando algo se desvia',
            ]}
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5 text-[#2361d8]" />}
            title="Bajo demanda con Isaak"
            bullets={[
              'Soporte cercano y en tu idioma',
              'Plazos fiscales siempre visibles',
              'Checklist de cierre mensual y anual',
            ]}
          />
        </div>
      </Container>
    </section>
  );
}

export function PídeseloAIsaakSection() {
  const isaakSignupUrl = `${getAppUrl()}/auth/signup?next=/dashboard?isaak=1`;
  const isaakChatUrl = `${getAppUrl()}/dashboard?isaak=1`;
  const isaakDialogue = [
    {
      q: 'Isaak, ?qu? falta para cerrar 2025?',
      a: 'Te faltan 2 facturas y un extracto bancario. Te aviso hoy ?',
    },
    {
      q: 'Resumen rápido de enero 2026',
      a: 'Vamos genial ?? Ventas 12.480 ?, gastos 7.130 ?. Beneficio 5.350 ?.',
    },
    {
      q: '¿Cómo voy de IVA este trimestre?',
      a: 'Estimación al día: 2.140 ? a ingresar. Te recuerdo fechas clave ??',
    },
    {
      q: '¿Tengo facturas con errores?',
      a: 'Detectú 1 factura sin NIF del cliente. ¿La corrijo ahora? ??',
    },
    {
      q: 'Sube estos tickets y clasifícalos',
      a: 'Listo ? Clasificados por proveedor y trimestre. Te marco deducibles.',
    },
    {
      q: '¿Qué plazo tengo esta semana?',
      a: 'Tienes conciliación pendiente y el registro de 3 facturas. Te guío.',
    },
    {
      q: '¿Cómo va mi beneficio hoy?',
      a: 'Beneficio estimado: 5.350 ?. Mejora del +12% vs. mes pasado ??',
    },
    {
      q: 'Quiero un informe para mi gestor',
      a: 'Preparado ?? Ventas, gastos, IVA y notas clave en un clic.',
    },
    {
      q: '¿Algún riesgo para el cierre?',
      a: 'Solo faltan 2 documentos. Si los subes hoy, cierre sin estrés ??',
    },
    {
      q: '¿Puedes revisar mis cobros?',
      a: 'Sí. Hay 3 pendientes y 1 vencido. Te preparo recordatorios ??',
    },
    {
      q: 'Explícame este CIF',
      a: 'Te dejo el desglose y lo guardo en tu ficha de cliente ??',
    },
    {
      q: '¿Tengo deducibles nuevos?',
      a: 'Sí, 4 gastos deducibles este mes. Te los resalto ??',
    },
    {
      q: '¿Cómo va mi caja?',
      a: 'Saldo previsto 18.240 ? en 10 días. Todo en verde ?',
    },
    {
      q: 'Crea un recordatorio de impuestos',
      a: 'Hecho. Te aviso 7 días antes y el mismo día ?',
    },
    {
      q: '¿Cuánto me queda para mi meta mensual?',
      a: 'Te faltan 1.920 ? para el objetivo. Vamos bien ??',
    },
    {
      q: '¿Hay facturas verificadas?',
      a: 'Sí, 9 facturas con trazabilidad en regla. Todo OK ?',
    },
    {
      q: 'Necesito priorizar tareas',
      a: '1) Subir extracto, 2) Confirmar NIF, 3) Conciliar banco.',
    },
    {
      q: '¿Puedes estimar el trimestre?',
      a: 'T1 2026 estimado: ventas 38.200 ?, beneficio 16.540 ? ??',
    },
    {
      q: 'Actualiza mis clientes top',
      a: 'Listo: 3 clientes concentran el 62% de ingresos.',
    },
    {
      q: '¿Puedo ver todo en un panel?',
      a: 'Sí. KPIs y alertas en tu dashboard en tiempo real ?',
    },
  ];
  const [qaIndex, setQaIndex] = React.useState(0);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setQaIndex((prev) => (prev + 1) % isaakDialogue.length);
    }, 4200);
    return () => clearInterval(intervalId);
  }, [isaakDialogue.length]);

  const visibleQas = [0, 1, 2].map(
    (offset) => isaakDialogue[(qaIndex + offset) % isaakDialogue.length]
  );

  return (
    <section className="py-16 bg-[#2361d8]/5">
      <Container>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-sm font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
            <Sparkles className="h-4 w-4 text-[#2361d8]" />
            Pídeselo a Isaak
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            Un amigo experto que habla tu idioma y te cuida los plazos.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
            Isaak entiende documentos, te acompaña en 2026 y convierte tu día a día en decisiones
            claras.
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-xs text-slate-500">
            Isaak no sustituye a tu asesor. Te ofrece visibilidad diaria de ventas, gastos y
            beneficio para decidir en tiempo real y llegar al cierre con todo ordenado.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#2361d8]">Isaak en vivo</div>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                Demo interactiva
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Cambia las preguntas y mira cómo responde Isaak con tono cercano y optimista.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button className="rounded-full border border-[#2361d8] bg-[#2361d8]/10 px-3 py-1 font-semibold text-[#2361d8]">
                Cercano ??
              </button>
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                Profesional ??
              </button>
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                Minimalista ?
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-700">Chat con Isaak</div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                </div>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visibleQas.map((item, index) => (
                    <motion.div
                      key={`${qaIndex}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35 }}
                      className="space-y-2"
                    >
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <div className="text-[11px] font-semibold text-slate-500">Tú</div>
                        <div className="mt-1">{item.q}</div>
                      </div>
                      <div className="rounded-2xl bg-[#2361d8]/10 px-3 py-2 text-sm text-slate-700">
                        <div className="text-[11px] font-semibold text-[#2361d8]">Isaak</div>
                        <div className="mt-1">{item.a}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-[#2361d8]">
              Deja de esperar al cierre de mes
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Con Isaak tienes ventas, gastos y beneficio estimado hoy. VeriFactu, al día.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <TrendingUp className="h-4 w-4 text-[#2361d8]" />
                  <span className="font-semibold">Beneficio estimado en tiempo real</span>
                </div>
                <p className="mt-1 text-xs">
                  Ves el impacto de ventas y gastos cada día, sin esperar a tu gestor.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <CalendarClock className="h-4 w-4 text-[#2361d8]" />
                  <span className="font-semibold">Avisos de calendario y plazos</span>
                </div>
                <p className="mt-1 text-xs">Recordatorios claros para no dejar nada fuera.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <BadgeCheck className="h-4 w-4 text-[#2361d8]" />
                  <span className="font-semibold">VeriFactu, siempre operativo</span>
                </div>
                <p className="mt-1 text-xs">
                  Trazabilidad y control listos para cumplir sin sustos.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={isaakSignupUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Hablar con Isaak ??
              </Link>
              <Link
                href={isaakChatUrl}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ya tengo cuenta, abrir chat
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Isaak te acompaña en el cierre 2025 y el arranque del primer trimestre de 2026.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-semibold text-[#2361d8]">
              Funciones principales de Isaak
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Todo lo que necesitas para estar al día sin esperar al cierre.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#2361d8]/10 p-2 text-[#2361d8]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Lectura de documentos</div>
                  <p className="mt-1 text-xs text-slate-600">
                    Extrae datos clave de escrituras, facturas y CIF para tu ficha.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#2361d8]/10 p-2 text-[#2361d8]">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Plazos y recordatorios</div>
                  <p className="mt-1 text-xs text-slate-600">
                    Avisos del trimestre y tareas clave para evitar retrasos.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#2361d8]/10 p-2 text-[#2361d8]">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Clasificación automática
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Sube gastos y los ordena por trimestre con deducibles marcados.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#2361d8]/10 p-2 text-[#2361d8]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Beneficio en tiempo real
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Ventas, gastos y beneficio estimado hoy, sin esperar al cierre.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#2361d8]/10 p-2 text-[#2361d8]">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Resumen para tu gestor</div>
                  <p className="mt-1 text-xs text-slate-600">
                    Informe claro con ventas, gastos y notas listas para enviar.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#2361d8]/10 p-2 text-[#2361d8]">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Cumplimiento sin estrés
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Te guía para llegar a tiempo y con todo correctamente preparado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
