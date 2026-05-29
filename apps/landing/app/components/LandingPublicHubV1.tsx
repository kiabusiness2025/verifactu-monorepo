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

const ISAAK_URL = 'https://isaak.verifactu.business';
const CLAUDE_CONNECTOR_URL = 'https://holded.verifactu.business/claude';
const CHATGPT_CONNECTOR_URL = 'https://holded.verifactu.business/chatgpt';

// ── Comparador "¿Cuál es para ti?" ───────────────────────────────────────────

const PATHS = [
  {
    badge: 'Producto principal',
    badgeColor: 'bg-[#2361d8] text-white',
    icon: '✦',
    title: 'Isaak',
    subtitle: 'IA fiscal todo incluido',
    ideal:
      'Quiero un asistente fiscal listo para usar, sin gestionar licencias IA ni configurar nada.',
    bullets: [
      'Chat en español con tus datos Holded',
      'Informes, gráficos y exports (Excel, PDF, Word)',
      'Alertas D-15/7/3/1 por cada vencimiento AEAT',
      'Corpus completo Agencia Tributaria',
    ],
    price: 'Desde 29 €/mes',
    priceNote: 'Trial 14 días · sin tarjeta',
    cta: 'Probar Isaak gratis',
    href: ISAAK_URL,
    accent: 'border-[#2361d8]/25 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)]',
    ctaClass: 'bg-[#2361d8] text-white hover:bg-[#1f55c0]',
  },
  {
    badge: 'Conector gratuito',
    badgeColor: 'bg-violet-100 text-violet-800',
    icon: '◈',
    title: 'Conector Claude',
    subtitle: 'Holded × Claude.ai',
    ideal:
      'Ya tengo Claude Pro o Teams y quiero consultar mi Holded directamente desde la conversación.',
    bullets: [
      'Conector MCP oficial Anthropic',
      'Lee facturas, ventas y contactos en vivo',
      'Crea borradores de factura desde Claude.ai',
      'Se instala en 2 minutos',
    ],
    price: 'Gratis',
    priceNote: 'Requiere Claude Pro o Teams',
    cta: 'Instalar en Claude',
    href: CLAUDE_CONNECTOR_URL,
    accent: 'border-violet-200 bg-white',
    ctaClass: 'bg-violet-600 text-white hover:bg-violet-700',
  },
  {
    badge: 'Conector gratuito',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    icon: '◉',
    title: 'Conector ChatGPT',
    subtitle: 'Holded × ChatGPT',
    ideal:
      'Ya tengo ChatGPT Plus o Teams y quiero acceder a mi ERP desde cualquier conversación con GPT-4o.',
    bullets: [
      'Conector oficial OpenAI Apps',
      'Lee facturas, ventas y contactos en vivo',
      'Crea borradores de factura desde ChatGPT',
      'Se instala en 2 minutos',
    ],
    price: 'Gratis',
    priceNote: 'Requiere ChatGPT Plus o Teams',
    cta: 'Instalar en ChatGPT',
    href: CHATGPT_CONNECTOR_URL,
    accent: 'border-emerald-200 bg-white',
    ctaClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
] as const;

const navLinks = [
  { label: 'Isaak', href: ISAAK_URL },
  { label: 'Conector Claude', href: CLAUDE_CONNECTOR_URL },
  { label: 'Conector ChatGPT', href: CHATGPT_CONNECTOR_URL },
  { label: 'Contacto', href: '/contacto' },
];

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

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={ISAAK_URL}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
                >
                  Probar Isaak gratis
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={ISAAK_URL + '/tour'}
                  className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#2361d8]/5"
                >
                  Ver demo →
                </a>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  O conecta tu IA favorita gratis
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={CLAUDE_CONNECTOR_URL}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Brain className="h-3.5 w-3.5" /> Claude.ai
                  </a>
                  <a
                    href={CHATGPT_CONNECTOR_URL}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Bot className="h-3.5 w-3.5" /> ChatGPT
                  </a>
                </div>
              </div>
            </div>

            {/* Hero mockup */}
            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </Container>
      </section>

      {/* ── ¿CUÁL ES PARA TI? ────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              ¿Cuál es para ti?
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Tres caminos para conectar Holded con IA. Elige según lo que ya tienes.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PATHS.map((p) => (
              <div
                key={p.title}
                className={`flex flex-col rounded-3xl border p-6 shadow-sm ${p.accent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-light text-[#2361d8]">{p.icon}</span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${p.badgeColor}`}
                  >
                    {p.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-[#011c67]">{p.title}</h3>
                <p className="text-sm font-medium text-[#2361d8]">{p.subtitle}</p>

                <p className="mt-3 text-sm leading-6 text-slate-500 italic">
                  &ldquo;{p.ideal}&rdquo;
                </p>

                <ul className="mt-4 space-y-1.5">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-xl border border-slate-100 bg-white px-4 py-3">
                  <div className="text-base font-bold text-[#011c67]">{p.price}</div>
                  <div className="text-xs text-slate-500">{p.priceNote}</div>
                </div>

                <a
                  href={p.href}
                  className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition ${p.ctaClass}`}
                >
                  {p.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── QUÉ PUEDES HACER CON ISAAK ───────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr,1.2fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#2361d8]">
                <Sparkles className="h-3.5 w-3.5" /> Isaak
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
                Tu contable IA para Holded
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Isaak lee tu ERP, genera informes visuales, te avisa antes de cada vencimiento AEAT
                y exporta cualquier documento en Excel, PDF o Word — todo en lenguaje natural.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  'Informes de ventas, gastos y cash flow con gráficos',
                  'Balance de situación y PyG al instante',
                  'Libro IVA, presupuestos y resúmenes fiscales',
                  'Alertas D-15/7/3/1 antes de cada declaración AEAT',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={ISAAK_URL}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
                >
                  Probar 14 días gratis <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={ISAAK_URL + '/tour'}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver demo →
                </a>
              </div>
            </div>

            {/* Isaak artifact mockup */}
            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </Container>
      </section>

      {/* ── CONECTORES GRATUITOS ─────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              O usa la IA que ya tienes
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Si ya tienes Claude Pro o ChatGPT Plus, instala el conector y consulta tu Holded desde
              ahí. Gratis, sin cambiar nada de lo que ya usas.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:max-w-3xl lg:mx-auto">
            {(
              [
                {
                  title: 'Conector Claude',
                  badge: 'bg-violet-100 text-violet-800',
                  Icon: Brain,
                  iconColor: 'text-violet-600',
                  bg: 'border-violet-200 bg-white',
                  bullets: [
                    'Instala el MCP oficial en Claude.ai o Claude Desktop',
                    'Consulta facturas, ventas y contactos en tiempo real',
                    'Crea borradores de factura desde la conversación',
                  ],
                  req: 'Requiere Claude Pro o Teams',
                  cta: 'Instalar en Claude',
                  href: CLAUDE_CONNECTOR_URL,
                  ctaClass: 'bg-violet-600 hover:bg-violet-700 text-white',
                },
                {
                  title: 'Conector ChatGPT',
                  badge: 'bg-emerald-100 text-emerald-800',
                  Icon: Bot,
                  iconColor: 'text-emerald-600',
                  bg: 'border-emerald-200 bg-white',
                  bullets: [
                    'Activa el conector en ChatGPT en dos pasos',
                    'Consulta facturas, ventas y contactos en tiempo real',
                    'Crea borradores de factura desde la conversación',
                  ],
                  req: 'Requiere ChatGPT Plus o Teams',
                  cta: 'Instalar en ChatGPT',
                  href: CHATGPT_CONNECTOR_URL,
                  ctaClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                },
              ] as const
            ).map((c) => (
              <div
                key={c.title}
                className={`flex flex-col rounded-3xl border p-6 shadow-sm ${c.bg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <c.Icon className={`h-5 w-5 ${c.iconColor}`} />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${c.badge}`}
                  >
                    Gratis
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#011c67]">{c.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-400">{c.req}</p>
                <a
                  href={c.href}
                  className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition ${c.ctaClass}`}
                >
                  {c.cta} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
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
              Conecta tu Holded con IA en minutos.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-slate-600">
              Elige el camino que mejor encaje: Isaak con IA incluida, o el conector para la IA que
              ya tienes. Sin tarjeta, sin compromiso, sin migrar nada.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={ISAAK_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Probar Isaak 14 días gratis
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={CLAUDE_CONNECTOR_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-300 bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                <Brain className="h-4 w-4" /> Conector Claude
              </a>
              <a
                href={CHATGPT_CONNECTOR_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <Bot className="h-4 w-4" /> Conector ChatGPT
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              ¿Dudas?{' '}
              <Link href="/contacto" className="underline hover:text-slate-600">
                Habla con el equipo
              </Link>
            </p>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
