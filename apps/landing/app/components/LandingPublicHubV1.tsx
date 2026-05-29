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

// ── Hero browser mockup (Option A) ───────────────────────────────────────────

const HERO_BARS = [5840, 6230, 7180, 6920, 8440, 7660, 5320, 4190, 7840, 8920, 9340, 10140];

function HeroMockup() {
  const max = Math.max(...HERO_BARS);
  const W = 260,
    H = 68,
    bB = 10;
  const bW = W / 12 - 3;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      {/* Chrome */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex flex-1 items-center justify-center rounded border border-slate-200 bg-white px-2 py-0.5">
          <span className="text-[10px] text-slate-400">app.isaak.app</span>
        </div>
        <div className="w-8" />
      </div>
      {/* Split */}
      <div className="flex h-[240px]">
        {/* Chat */}
        <div className="flex w-[42%] flex-col border-r border-slate-100 bg-slate-50/60 p-2.5">
          <div className="flex justify-end">
            <div className="max-w-[90%] rounded-xl rounded-tr-sm bg-[#2361d8] px-2.5 py-1.5 text-[10px] leading-relaxed text-white">
              ¿Cuánto hemos vendido en 2024?
            </div>
          </div>
          <div className="mt-2 flex items-start gap-1.5">
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-[9px] font-bold text-white">
              I
            </div>
            <div className="max-w-[90%] rounded-xl rounded-tl-sm border border-slate-100 bg-white px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-700 shadow-sm">
              En 2024 facturasteis 88.240 € en 199 facturas. Q4 fue el trimestre más fuerte.
            </div>
          </div>
          <div className="mt-2 ml-6">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-700">
              📊 Ver informe
            </span>
          </div>
          <div className="mt-auto border-t border-slate-200 bg-white pt-1.5">
            <div className="flex h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[9px] text-slate-400">
              Escribe a Isaak...
            </div>
          </div>
        </div>
        {/* Panel */}
        <div className="flex w-[58%] flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5">
            <span className="text-[10px] font-semibold text-[#011c67]">
              📊 Ventas por mes — 2024
            </span>
            <span className="text-[9px] text-slate-400">✕</span>
          </div>
          <div className="flex-1 p-2.5">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
              {HERO_BARS.map((v, i) => {
                const bH = (v / max) * (H - bB - 4);
                const x = i * (W / 12) + 1.5;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={H - bB - bH}
                      width={bW}
                      height={bH}
                      rx={2}
                      fill="#2361d8"
                      opacity={0.45 + 0.55 * (v / max)}
                    />
                    {(i === 0 || i === 3 || i === 6 || i === 9 || i === 11) && (
                      <text
                        x={x + bW / 2}
                        y={H - 1}
                        textAnchor="middle"
                        fontSize={6}
                        fill="#94a3b8"
                      >
                        {
                          ['Ene', 'Abr', 'Jul', 'Oct', 'Dic'][
                            i === 0 ? 0 : i === 3 ? 1 : i === 6 ? 2 : i === 9 ? 3 : 4
                          ]
                        }
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {[
                ['Ventas', '88.240 €'],
                ['Neto', '78.332 €'],
                ['IVA', '15.291 €'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-md bg-slate-50 p-1.5">
                  <div className="text-[8px] text-slate-500">{l}</div>
                  <div className="text-[10px] font-bold text-[#011c67]">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1">
              {['📗', '📄', '📝'].map((ic) => (
                <span
                  key={ic}
                  className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-500"
                >
                  {ic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Features section cards (Option C) ────────────────────────────────────────

const FEATURE_BARS = [5840, 7180, 8440, 5320, 7840, 10140];

function MiniBarChart() {
  const max = Math.max(...FEATURE_BARS);
  return (
    <svg viewBox="0 0 120 40" className="w-full" aria-hidden="true">
      {FEATURE_BARS.map((v, i) => {
        const bH = (v / max) * 34;
        const bW = 14;
        const x = i * 20 + 2;
        return (
          <rect
            key={i}
            x={x}
            y={40 - bH}
            width={bW}
            height={bH}
            rx={2}
            fill="#2361d8"
            opacity={0.4 + 0.6 * (v / max)}
          />
        );
      })}
    </svg>
  );
}

function MiniBalanceTable() {
  const rows = [
    { l: 'ACTIVO', v: '', h: true },
    { l: 'Caja y bancos', v: '32.840 €', h: false },
    { l: 'TOTAL ACTIVO', v: '83.800 €', h: true },
    { l: 'Patrimonio neto', v: '68.420 €', h: false },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-slate-100 text-[9px]">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex justify-between px-2 py-1 ${r.h ? 'bg-[#0b2060] font-semibold text-white' : i % 2 === 0 ? 'bg-white text-slate-700' : 'bg-slate-50 text-slate-700'}`}
        >
          <span>{r.l}</span>
          {r.v && <span className={r.h ? '' : 'font-medium'}>{r.v}</span>}
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    emoji: '📊',
    title: 'Informes visuales',
    body: 'Gráficos de barras, líneas y sectores generados al instante desde una pregunta en lenguaje natural.',
    visual: <MiniBarChart />,
  },
  {
    emoji: '📥',
    title: 'Exports en un clic',
    body: 'Cualquier informe descargable en Excel, PDF y Word sin configurar nada.',
    visual: (
      <div className="flex justify-center gap-3 py-2">
        {[
          ['📗', 'Excel', 'text-emerald-700 bg-emerald-50'],
          ['📄', 'PDF', 'text-red-600 bg-red-50'],
          ['📝', 'Word', 'text-blue-700 bg-blue-50'],
        ].map(([ic, label, cls]) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium ${cls}`}
          >
            <span className="text-2xl">{ic}</span>
            {label}
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: '⚖️',
    title: 'Balance y PyG',
    body: 'Balance de situación y cuenta de resultados generados al cierre del periodo que elijas.',
    visual: <MiniBalanceTable />,
  },
  {
    emoji: '🔔',
    title: 'Alertas fiscales',
    body: 'D-15, D-7, D-3 y D-1 antes de cada vencimiento AEAT. Cero sustos con Hacienda.',
    visual: (
      <div className="space-y-1">
        {[
          ['D-15', 'Modelo 303 · T2 2025', 'bg-amber-50 text-amber-700'],
          ['D-7', 'Pago fraccionado 130', 'bg-orange-50 text-orange-700'],
          ['D-1', 'Modelo 111 · Mayo', 'bg-red-50 text-red-700'],
        ].map(([d, label, cls]) => (
          <div
            key={d}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${cls}`}
          >
            <span className="font-bold">{d}</span>
            <span className="opacity-80">{label}</span>
          </div>
        ))}
      </div>
    ),
  },
];

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
          <div className="grid items-center gap-12 lg:grid-cols-[1fr,1.1fr]">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Verifactu Business
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
                La forma más simple de cumplir y crecer con Holded.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
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

              <div className="mt-8">
                <a
                  href={ISAAK_URL + '/tour'}
                  className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#2361d8]/5"
                >
                  Ver Isaak en acción
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Hero mockup */}
            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </Container>
      </section>

      {/* ── LO QUE ISAAK PUEDE HACER (Option C) ─────────────────────────── */}
      <section className="py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Lo que Isaak puede hacer por tu empresa
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Pregunta en español. Isaak consulta tu Holded y devuelve informes listos para usar.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ emoji, title, body, visual }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/10 text-xl">
                  {emoji}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#011c67]">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
                <div className="mt-4">{visual}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href={ISAAK_URL + '/tour'}
              className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
            >
              Ver todos los escenarios en acción
              <ArrowRight className="h-4 w-4" />
            </a>
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
              Crea cuenta en Isaak o instala el conector que prefieras. Sin tarjeta, sin compromiso,
              sin migrar nada de tu Holded.
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
