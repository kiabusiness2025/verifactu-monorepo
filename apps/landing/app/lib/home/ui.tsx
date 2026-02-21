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
  const appUrl = getAppUrl();
  return (
    <div
      className={`fixed inset-x-0 bottom-4 z-30 px-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm font-semibold text-[#2361d8]">
          Empieza gratis y mantén acceso de lectura y exportación.
        </div>
        <div className="flex gap-2">
          <Link href={appUrl}>
            <PrimaryButton className="h-10 px-4 text-sm">Empezar gratis (para siempre)</PrimaryButton>
          </Link>
          <SecondaryButton href="/planes" className="h-10 px-4 text-sm">
            Ver planes
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
  const slides = [
    {
      id: "overview",
      title: "Resumen demo",
      caption: "KPIs, empresa activa y tareas del día.",
      src: "/assets/hero/demo-overview.svg",
      mini: "Inicio",
    },
    {
      id: "invoices",
      title: "Facturas en demo",
      caption: "Estados, importes y validación VeriFactu.",
      src: "/assets/hero/demo-invoices.svg",
      mini: "Facturas",
    },
    {
      id: "isaak",
      title: "Asistente flotante",
      caption: "Mensajes proactivos según la sección activa.",
      src: "/assets/hero/demo-isaak.svg",
      mini: "Isaak",
    },
  ] as const;
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [sampleIndex, setSampleIndex] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<"video" | "slides">("video");
  const [videoAvailable, setVideoAvailable] = React.useState(true);

  const isaakSamplesBySlide: Record<(typeof slides)[number]["id"], string[]> = {
    overview: [
      "Inicio: \"Tu beneficio hoy es 2.876,40 EUR\"",
      "Clientes: \"Te faltan 2 seguimientos de cobro\"",
      "Bancos: \"Revisa el saldo previsto para esta semana\"",
    ],
    invoices: [
      "Facturas: \"1 factura pendiente de cobro\"",
      "Documentos: \"Sube el ticket y lo clasifico\"",
      "Calendario: \"Modelo IVA en 12 dias\"",
    ],
    isaak: [
      "Configuracion: \"Conecta eInforma en 1 paso\"",
      "Facturas: \"Preparo borrador VeriFactu\"",
      "Inicio: \"Quieres resumen semanal?\"",
    ],
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [slides.length]);

  React.useEffect(() => {
    setSampleIndex(0);
  }, [activeIndex]);

  React.useEffect(() => {
    const totalSamples = isaakSamplesBySlide[slides[activeIndex].id].length;
    const interval = setInterval(() => {
      setSampleIndex((prev) => (prev + 1) % totalSamples);
    }, 2800);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const progress = `${((activeIndex + 1) / slides.length) * 100}%`;

  return (
    <div className="relative rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.35)] backdrop-blur sm:p-5">
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          Demo en vivo
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("video")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "video"
                ? "bg-[#2361d8] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => setViewMode("slides")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "slides"
                ? "bg-[#2361d8] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Mockups
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
        <div className="relative aspect-[16/10] w-full">
          {viewMode === "video" && videoAvailable ? (
            <video
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              poster={slides[activeIndex].src}
              onError={() => {
                setVideoAvailable(false);
                setViewMode("slides");
              }}
            >
              <source src="/assets/hero/generated/demo-hero.mp4" type="video/mp4" />
            </video>
          ) : null}
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  (viewMode === "slides" || !videoAvailable) && isActive
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                aria-label={`Ver mockup ${slide.title}`}
                aria-pressed={isActive}
              >
                <Image src={slide.src} alt={slide.title} fill className="object-cover" priority={idx === 0} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2361d8]">
            Demo Verifactu
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{slides[activeIndex].title}</div>
          <p className="mt-1 text-sm text-slate-600">{slides[activeIndex].caption}</p>
        </div>
        <div className="mt-1 flex gap-1.5">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2.5 w-2.5 rounded-full transition ${idx === activeIndex ? "bg-[#2361d8]" : "bg-slate-300 hover:bg-slate-400"}`}
              aria-label={`Ir a ${slide.title}`}
              aria-pressed={idx === activeIndex}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2361d8] to-[#20B0F0] transition-all duration-500"
          style={{ width: progress }}
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`overflow-hidden rounded-xl border text-left transition ${
              idx === activeIndex
                ? "border-[#2361d8] bg-[#2361d8]/5 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="relative h-14 w-full">
              <Image src={slide.src} alt={`${slide.title} miniatura`} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
            </div>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-700">{slide.mini}</div>
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute -right-5 top-20 w-[300px] rounded-xl border border-blue-200 bg-white/95 p-3 text-[11px] shadow-md">
        <div className="font-semibold text-[#2361d8]">Isaak sugiere</div>
        <div className="mt-2 text-slate-700">
          <div className="rounded-lg bg-blue-50 px-2 py-1.5 transition-all duration-500">
            {isaakSamplesBySlide[slides[activeIndex].id][sampleIndex]}
          </div>
          <div className="mt-2 flex gap-1">
            {isaakSamplesBySlide[slides[activeIndex].id].map((sample, idx) => (
              <span
                key={sample}
                className={`h-1.5 w-1.5 rounded-full ${idx === sampleIndex ? "bg-[#2361d8]" : "bg-blue-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -left-4 bottom-20 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2 text-[11px] font-semibold text-emerald-700 shadow-md">
        KPI + facturas + tareas
      </div>
      <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-cyan-200/40 blur-2xl" />
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
              { label: 'Planes', href: '#planes' },
            ]}
          />
          <FooterCol
            title="VeriFactu"
            links={[
              { label: 'Que es', href: '/verifactu/que-es' },
              { label: 'Ver planes', href: '/planes' },
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

export function PideseloAIsaakSection() {
  const isaakSignupUrl = `${getAppUrl()}/auth/signup?next=/dashboard?isaak=1`;
  const isaakChatUrl = `${getAppUrl()}/dashboard?isaak=1`;
  const toneOptions = [
    { key: 'cercano', label: 'Cercano', emoji: '😊' },
    { key: 'profesional', label: 'Profesional', emoji: '🧑‍💼' },
    { key: 'minimalista', label: 'Minimalista', emoji: '⚡' },
  ] as const;
  type ToneKey = (typeof toneOptions)[number]['key'];

  const isaakDialogueByTone: Record<ToneKey, Array<{ q: string; a: string }>> = {
    cercano: [
      { q: 'Isaak, ¿qué falta para cerrar 2025?', a: 'Te faltan 2 facturas y un extracto. Si quieres, te lo dejo hoy cerrado 😊' },
      { q: 'Resumen rápido de enero 2026', a: 'Vas muy bien: ventas 12.480 EUR, gastos 7.130 EUR, beneficio 5.350 EUR 🚀' },
      { q: '¿Cómo voy de IVA este trimestre?', a: 'Estimación actual: 2.140 EUR a ingresar. Te recuerdo fechas clave para ir tranquilo 📅' },
      { q: '¿Tengo facturas con errores?', a: 'Sí, veo 1 factura sin NIF. La corregimos en 1 minuto y listo ✅' },
      { q: 'Sube estos tickets y clasifícalos', a: 'Perfecto, los clasifico por proveedor y trimestre, y te marco deducibles 📎' },
      { q: '¿Qué plazo tengo esta semana?', a: 'Tienes 3 tareas fiscales activas. Te ordeno prioridad para que no se te escape nada 👌' },
    ],
    profesional: [
      { q: 'Isaak, ¿qué falta para cerrar 2025?', a: 'Pendientes: 2 facturas y 1 extracto bancario. Estado: cierre parcial.' },
      { q: 'Resumen rápido de enero 2026', a: 'Ventas: 12.480 EUR. Gastos: 7.130 EUR. Beneficio: 5.350 EUR.' },
      { q: '¿Cómo voy de IVA este trimestre?', a: 'Estimación de IVA: 2.140 EUR. Próximo hito fiscal programado en calendario.' },
      { q: '¿Tengo facturas con errores?', a: 'Se detecta 1 incidencia: factura sin NIF del cliente. Recomendación: corregir hoy.' },
      { q: 'Sube estos tickets y clasifícalos', a: 'Documentos procesados. Clasificación contable completada y validación aplicada.' },
      { q: '¿Qué plazo tengo esta semana?', a: 'Hay 3 obligaciones activas. Prioridad sugerida: alta, media y seguimiento.' },
    ],
    minimalista: [
      { q: 'Isaak, ¿qué falta para cerrar 2025?', a: 'Faltan 2 facturas + 1 extracto.' },
      { q: 'Resumen rápido de enero 2026', a: '12.480 EUR ventas | 7.130 EUR gastos | 5.350 EUR beneficio.' },
      { q: '¿Cómo voy de IVA este trimestre?', a: 'IVA estimado: 2.140 EUR.' },
      { q: '¿Tengo facturas con errores?', a: 'Sí. 1 factura sin NIF.' },
      { q: 'Sube estos tickets y clasifícalos', a: 'Hecho. Clasificados y deducibles marcados.' },
      { q: '¿Qué plazo tengo esta semana?', a: '3 tareas fiscales activas.' },
    ],
  };
  const [tone, setTone] = React.useState<ToneKey>('cercano');
  const [qaIndex, setQaIndex] = React.useState(0);
  const isaakDialogue = isaakDialogueByTone[tone];

  React.useEffect(() => {
    setQaIndex(0);
  }, [tone]);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setQaIndex((prev) => (prev + 1) % isaakDialogue.length);
    }, 4200);
    return () => clearInterval(intervalId);
  }, [isaakDialogue]);

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
              Cambia el humor de Isaak y mira cómo adapta su respuesta en tiempo real.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {toneOptions.map((option) => {
                const active = tone === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTone(option.key)}
                    className={`rounded-full border px-3 py-1 font-semibold transition ${
                      active
                        ? 'border-[#2361d8] bg-[#2361d8]/10 text-[#2361d8]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                );
              })}
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
