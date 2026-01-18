import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
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
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import type { IsaakMsg } from "./types";
import { getAppUrl } from "../urls";
import { Button } from "../../components/ui";

export function Container({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PrimaryButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <Button variant="primary" size="md" className={className}>
      {children}
    </Button>
  );
}

export function SecondaryButton({
  className = "",
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
      className={`fixed inset-x-0 bottom-4 z-30 px-4 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm font-semibold text-[#002060]">Prueba gratis y ve Isaak en acción</div>
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

      <div className="mt-4 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 p-4 ring-1 ring-slate-200/50">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0060F0]">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="text-xs font-semibold text-[#002060]">Respuesta de Isaak</div>
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
  const formattedBenefit = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(benefitValue);

  const heroLog = [
    { title: "Factura VF-2031", desc: "Validada y enviada al cliente" },
    { title: "Ticket combustible", desc: "Marcado deducible y registrado" },
    { title: "Sync VeriFactu", desc: "Ultima validacion hace 3 min" },
  ];

  return (
    <div className="relative">
      <div className="absolute -right-6 top-10 hidden h-40 w-40 rounded-full bg-blue-100 blur-3xl lg:block" />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <Sparkles className="h-4 w-4 text-[#0080F0]" />
            Isaak
          </div>
          <button className="text-xs font-medium text-[#0060F0] hover:text-[#0080F0]">Conectar</button>
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
          <MiniStat title="Resumen" value={formattedBenefit} sub="Beneficio estimado" badge="Completo" />
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

export function MsgDot({ type }: { type: IsaakMsg["type"] }) {
  const cls = type === "ok" ? "bg-emerald-500" : type === "warn" ? "bg-amber-500" : "bg-[#0080F0]";
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

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0060F0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
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
        <div className="text-lg font-semibold text-[#002060]">{label}</div>
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
      <button className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]">
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
        <div className="rounded-full bg-sky-50/70 px-3 py-1 text-xs font-semibold text-[#0080F0] ring-1 ring-[#0080F0]/15">
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
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Isaak Control Center</div>
        <span className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          Suscripcion Business Plus
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Ventas del mes" value="48.230 EUR" sub="+12%" />
        <KpiCard label="Gastos del mes" value="36.900 EUR" sub="+7%" />
        <KpiCard label="Beneficio" value="12.410 EUR" sub="+8%" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-700">Isaak</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            He detectado un aumento de gastos en proveedores. Quieres que identifique los que mas afectan al margen?
          </p>

          <div className="mt-3 flex gap-2">
            <button className="rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-2 text-xs font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB]">
              Analizar ahora
            </button>
            <button className="rounded-full border border-[#0060F0] bg-white px-4 py-2 text-xs font-semibold text-[#0060F0] hover:bg-[#0060F0]/10">
              Mas tarde
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-700">Actividad reciente</div>
          <div className="mt-3 space-y-2">
            <ActivityItem icon={<FileText className="h-4 w-4 text-[#0080F0]" />} text="Factura VF-2031 emitida y validada" />
            <ActivityItem icon={<UploadCloud className="h-4 w-4 text-[#0080F0]" />} text="3 tickets reconocidos desde Drive" />
            <ActivityItem icon={<CalendarClock className="h-4 w-4 text-[#0080F0]" />} text="Recordatorio creado: plazo fiscal en 5 dias" />
            <ActivityItem icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} text="Checklist VeriFactu: todo en orden" />
          </div>
        </div>
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

export function ResourceCard({ tag, title, desc, cta }: { tag: string; title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
        {tag}
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
      <button className="mt-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-2 text-xs font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB]">
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
    <footer className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-slate-100" role="contentinfo">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <Container className="py-12 relative z-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <BrandLogo variant="footer" />
            <p className="mt-3 text-sm text-slate-300">Automatiza tu facturacion con cumplimiento y control total.</p>
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
              { label: "Resumen", href: "#hero" },
              { label: "Dashboard", href: "#dashboard" },
              { label: "Features", href: "#features" },
              { label: "FAQ", href: "#faq" },
              { label: "Precios", href: "#precios" },
            ]}
          />
          <FooterCol
            title="VeriFactu"
            links={[
              { label: "Que es", href: "/verifactu/que-es" },
              { label: "Calcula precio", href: "/#precios" },
              { label: "Soporte", href: "/verifactu/soporte" },
              { label: "Estado del servicio", href: "/verifactu/estado" },
            ]}
          />
          <FooterCol
            title="Recursos"
            links={[
              { label: "Guias y webinars", href: "/recursos/guias-y-webinars" },
              { label: "Checklist", href: "/recursos/checklist" },
              { label: "Blog", href: "/recursos/blog" },
              { label: "Contacto", href: "/recursos/contacto" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: "VeriFactu", href: "/verifactu" },
              { label: "Politica de privacidad", href: "/legal/privacidad" },
              { label: "Terminos de servicio", href: "/legal/terminos" },
              { label: "Cookies", href: "/legal/cookies" },
            ]}
          />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>(c) {new Date().getFullYear()} Verifactu Business. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <Link href="/verifactu" className="hover:text-blue-300 transition" aria-label="Ir a VeriFactu">
                VeriFactu
              </Link>
              <Link href="/legal/privacidad" className="hover:text-blue-300 transition" aria-label="Leer politica de privacidad">
                Politica de privacidad
              </Link>
              <Link href="/legal/terminos" className="hover:text-blue-300 transition" aria-label="Leer terminos de servicio">
                Terminos de servicio
              </Link>
              <Link href="/legal/cookies" className="hover:text-blue-300 transition" aria-label="Leer politica de cookies">
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
            <Link className="hover:text-blue-300 transition" href={link.href} aria-label={`Ir a ${link.label}`}>
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
      <div className="text-sm text-slate-500">{isYearly ? "/ano" : "/mes"}</div>
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
          <p className="mt-3 text-xs text-slate-500">Sistema homologado segun normativa de la Agencia Tributaria</p>
        </div>
      </div>
    </div>
  );
}

export function ThreeSteps() {
  return (
    <section className="py-16 bg-gradient-to-b from-sky-50/70 via-blue-50/40 to-white">
      <Container>
        <h3 className="text-center text-2xl font-semibold tracking-tight text-[#002060] sm:text-3xl">Del envio al cobro en tres pasos.</h3>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-lightbg-600 sm:text-base">
          Conecta tu flujo de facturacion y deja que Isaak automatice validaciones y recordatorios.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StepCard
            n={1}
            title="Configura Isaak"
            desc="Define tus datos, series y reglas. Conecta Drive y calendario para automatizar el orden."
            icon={<LayoutDashboard className="h-5 w-5 text-[#0080F0]" />}
          />
          <StepCard
            n={2}
            title="Emite y valida"
            desc="Genera la factura y valida automaticamente con VeriFactu antes de enviarla."
            icon={<FileText className="h-5 w-5 text-[#0080F0]" />}
          />
          <StepCard
            n={3}
            title="Cobra y analiza"
            desc="Isaak monitoriza el ciclo, detecta incidencias y te resume impacto en margen."
            icon={<Wallet className="h-5 w-5 text-[#0080F0]" />}
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
        <h2 className="text-center text-3xl font-bold tracking-tight text-[#002060] sm:text-4xl">
          Lo que ves es lo que tienes: Ventas, Gastos, Beneficio.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-lightbg-600 sm:text-lg">
          El dashboard muestra solo lo esencial. Isaak entiende documentos, detecta el idioma y te guia con alertas y
          recordatorios cuando se acercan cierres y plazos fiscales.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5 text-[#0080F0]" />}
            title="Emision sin friccion"
            bullets={[
              "Sube facturas y tickets en cualquier idioma",
              "Isaak interpreta y clasifica al instante",
              "Validacion VeriFactu incluida",
            ]}
          />
          <FeatureCard
            icon={<BadgeCheck className="h-5 w-5 text-[#0080F0]" />}
            title="Gastos guiados"
            bullets={[
              "Documentos, extractos y justificantes",
              "Deducible segun tu actividad",
              "Recordatorios de cierres y plazos",
            ]}
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-[#0080F0]" />}
            title="Dashboard claro"
            bullets={[
              "Ventas, gastos y beneficio en tiempo real",
              "Comparativas por mes y trimestre",
              "Alertas cuando algo se desvia",
            ]}
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5 text-[#0080F0]" />}
            title="Bajo demanda con Isaak"
            bullets={[
              "Soporte cercano y en tu idioma",
              "Plazos fiscales siempre visibles",
              "Checklist de cierre mensual y anual",
            ]}
          />
        </div>
      </Container>
    </section>
  );
}

export function PideseloAIsaakSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
      <Container>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50/70 px-4 py-1.5 text-sm font-semibold text-[#0080F0] ring-1 ring-[#0080F0]/15">
            <Sparkles className="h-4 w-4 text-[#0080F0]" />
            Pideselo a Isaak
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#002060] sm:text-4xl">
            Un amigo experto que habla tu idioma y te cuida los plazos.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
            Isaak interpreta documentos, avisa de cierres (ejercicio 2025, T4 2025), ayuda a cargar tus datos reales
            y te guia mientras la prueba se acerca a su fin.
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-xs text-slate-500">
            Isaak no sustituye a tu gestor o asesor contable. Te ofrece datos de ventas, gastos y beneficio para
            decidir en tiempo real y revisar lo que te preparen al cierre de mes, trimestre o ano.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <CommandExample
            command="Explicame estas escrituras y el CIF"
            response="He extraido los datos clave y los he guardado en tu ficha de empresa. Si falta algo, te lo marco para completar en 2 minutos."
          />
          <CommandExample
            command="Estamos en cierre 2025, que me falta?"
            response="Te faltan 2 facturas de diciembre y un extracto bancario. Quieres que te recuerde los plazos y lo deje listo para tu gestor?"
          />
          <CommandExample
            command="Recuerdame el 4o trimestre de 2025"
            response="He creado recordatorios para los plazos del T4 2025 y te avisare con tiempo. Si quieres, preparo el resumen fiscal automatico."
          />
          <CommandExample
            command="Sube estos gastos y ordenalos por trimestre"
            response="Cargados y clasificados. He creado un resumen por trimestre con deducibles y pendientes de revision."
          />
          <CommandExample
            command="Prepara un resumen para mi gestor"
            response="Listo: ventas, gastos y beneficio del periodo, con notas y posibles discrepancias para revisar juntos."
          />
          <CommandExample
            command="Mi prueba termina en 5 dias"
            response="Te recomiendo el plan que mejor encaja por tu uso. Si quieres, preparo la transicion para no perder datos."
          />
        </div>
      </Container>
    </section>
  );
}






