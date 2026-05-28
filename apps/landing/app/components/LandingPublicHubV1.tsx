// V1 LAUNCH (2026-05-28) — Hub minimal.
//
// Landing pública de verifactu.business reducida a Hub de 3 productos:
//   1. Isaak — el asistente fiscal de pago (IA incluida)
//   2. Conector Claude — Holded × Claude.ai (gratis, requiere Claude Pro)
//   3. Conector ChatGPT — Holded × ChatGPT (gratis, requiere ChatGPT Plus)
//
// Reemplaza al LandingPublicHubPhase1 mientras dura V1. Se activa con
// NEXT_PUBLIC_ISAAK_V1_LAUNCH=true. El Hub Phase1 (con sectoriales,
// asesorías, etc.) queda intacto para reactivarlo en V2+.
//
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

import {
  ArrowRight,
  Bot,
  Bell,
  Brain,
  CheckCircle2,
  MessageSquare,
  Plug,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import Header from './Header';
import { Container, Footer } from '../lib/home/ui';

const ISAAK_URL = 'https://isaak.verifactu.business';
const CLAUDE_CONNECTOR_URL = 'https://holded.verifactu.business/claude';
const CHATGPT_CONNECTOR_URL = 'https://holded.verifactu.business/chatgpt';

const navLinks = [
  { label: 'Isaak', href: ISAAK_URL },
  { label: 'Precios', href: ISAAK_URL + '/pricing' },
  { label: 'Contacto', href: '/contacto' },
];

const PRODUCTS = [
  {
    badge: 'Producto principal',
    badgeColor: 'bg-[#2361d8] text-white',
    title: 'Isaak',
    tagline: 'Asistente fiscal y contable para Holded',
    body: 'Pregunta lo que necesites sobre tu Holded en español. Recibe alertas antes de cada vencimiento AEAT. IA incluida — sin licencia Claude ni ChatGPT propia.',
    bullets: [
      'Chat con datos reales de Holded',
      'Corpus completo de Agencia Tributaria',
      'Alertas D-15/7/3/1 antes de cada vencimiento',
      'Trial 14 días sin tarjeta',
    ],
    ctaPrimary: { label: 'Probar 14 días gratis', href: ISAAK_URL },
    ctaSecondary: { label: 'Ver pricing', href: ISAAK_URL + '/pricing' },
    icon: Sparkles,
    accent: 'border-[#2361d8]/30 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)]',
  },
  {
    badge: 'Conector gratis',
    badgeColor: 'bg-violet-100 text-violet-800',
    title: 'Conector Claude',
    tagline: 'Trae tu Holded a Claude.ai',
    body: 'Instala el conector MCP oficial en Claude Desktop o Claude.ai y consulta tus facturas, ventas y contactos directamente desde la conversación. La IA la pones tú.',
    bullets: [
      'Conector MCP oficial Anthropic',
      'Lectura completa del ERP',
      'Crear borradores de factura',
      'Requiere Claude Pro o Teams',
    ],
    ctaPrimary: { label: 'Instalar en Claude', href: CLAUDE_CONNECTOR_URL },
    ctaSecondary: null,
    icon: Brain,
    accent: 'border-violet-200 bg-white',
  },
  {
    badge: 'Conector gratis',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    title: 'Conector ChatGPT',
    tagline: 'Trae tu Holded a ChatGPT',
    body: 'Activa el conector personalizado en ChatGPT y haz consultas a tu ERP desde cualquier conversación con GPT-4o. La IA la pones tú.',
    bullets: [
      'Conector oficial OpenAI Apps',
      'Lectura completa del ERP',
      'Crear borradores de factura',
      'Requiere ChatGPT Plus o Teams',
    ],
    ctaPrimary: { label: 'Instalar en ChatGPT', href: CHATGPT_CONNECTOR_URL },
    ctaSecondary: null,
    icon: Bot,
    accent: 'border-emerald-200 bg-white',
  },
] as const;

const COMMON_VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: 'Cumplimiento VeriFactu listo',
    body: 'Los borradores que crea cualquier herramienta van directos a Holded. Tú apruebas y emites — Holded firma y registra en AEAT.',
  },
  {
    icon: Plug,
    title: 'Sin fricción de instalación',
    body: 'Pega tu API key de Holded una vez. Listo. Sin migraciones, sin cambiar de software, sin perder datos.',
  },
  {
    icon: Bell,
    title: 'No olvidas un vencimiento',
    body: 'Isaak vigila tus plazos del 303, 130 y resto de modelos. Te avisa D-15, D-7, D-3 y D-1 por email.',
  },
];

export default function LandingPublicHubV1() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Verifactu Business
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
              La forma más simple de cumplir y crecer con Holded.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Tres formas de trabajar con tu Holded a través de IA: una app web propia con todo
              incluido o conectores gratis para Claude.ai y ChatGPT. Tú eliges cómo prefieres.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Sin migrar ningún dato
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Compatible con tu Holded actual
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                VeriFactu listo de serie
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 3 PRODUCTOS ──────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Nuestros productos
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Empieza por el que mejor encaje contigo. Puedes usarlos por separado o combinados.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PRODUCTS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className={`flex flex-col rounded-3xl border p-6 shadow-sm transition hover:shadow-lg ${p.accent}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                      <Icon className="h-5 w-5 text-[#2361d8]" />
                    </div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${p.badgeColor}`}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-[#011c67]">{p.title}</h3>
                  <p className="mt-1 text-sm font-medium text-[#2361d8]">{p.tagline}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{p.body}</p>

                  <ul className="mt-5 space-y-2">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-col gap-2">
                    <a
                      href={p.ctaPrimary.href}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
                    >
                      {p.ctaPrimary.label}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    {p.ctaSecondary && (
                      <a
                        href={p.ctaSecondary.href}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {p.ctaSecondary.label}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── VALOR COMÚN ──────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-14">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67]">
              Lo que todos comparten
            </h2>
            <p className="mt-3 text-base text-slate-600">
              No importa qué herramienta elijas — el resultado es el mismo.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {COMMON_VALUE_PROPS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/10">
                  <Icon className="h-5 w-5 text-[#2361d8]" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#011c67]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <MessageSquare className="h-3 w-3" />
              Empieza hoy
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Tu asistente fiscal te espera.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-slate-600">
              Crea cuenta en Isaak o instala el conector que prefieras. Sin tarjeta, sin
              compromiso, sin migrar nada de tu Holded.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={ISAAK_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Probar Isaak 14 días gratis
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hablar con el equipo
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
