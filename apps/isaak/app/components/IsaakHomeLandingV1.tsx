// V1 LAUNCH (2026-05-28) — landing producto Isaak minimal.
//
// Reemplaza al IsaakHomeLanding completo bajo NEXT_PUBLIC_ISAAK_V1_LAUNCH=true.
// El propósito es enfocar: una sola propuesta (asistente fiscal con Holded),
// pricing simple (Free vs Pro 29€), CTA único (trial 14 días sin tarjeta).
//
// Sin charts animados, sin demos interactivas, sin live counters. La landing
// completa con sectoriales y todo el showcase vive en IsaakHomeLanding y se
// reactivará en V2+ quitando el flag.
//
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

import {
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  MessageSquare,
  Plug,
  Sparkles,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import PricingSectionV1 from './PricingSectionV1';

export const isaakLandingV1Metadata: Metadata = {
  title: 'Isaak — Asistente fiscal y contable para Holded',
  description:
    'Conecta tu Holded en 30 segundos. Pregunta lo que necesites. Recibe alertas antes de cada vencimiento. IA incluida — sin licencia Claude ni ChatGPT propia. Prueba 14 días gratis sin tarjeta.',
};

const SIGNUP_URL = '/signup';

// ── Hero browser mockup ───────────────────────────────────────────────────────

const HERO_BARS = [5840, 6230, 7180, 6920, 8440, 7660, 5320, 4190, 7840, 8920, 9340, 10140];
const BAR_LABELS = ['Ene', 'Abr', 'Jul', 'Oct', 'Dic'];
const BAR_LABEL_IDX = [0, 3, 6, 9, 11];

function HeroMockup() {
  const max = Math.max(...HERO_BARS);
  const W = 260,
    H = 68,
    bB = 10;
  const bW = W / 12 - 3;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
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
      <div className="flex h-[230px]">
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
        {/* Artifact panel */}
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
                    {BAR_LABEL_IDX.includes(i) && (
                      <text
                        x={x + bW / 2}
                        y={H - 1}
                        textAnchor="middle"
                        fontSize={6}
                        fill="#94a3b8"
                      >
                        {BAR_LABELS[BAR_LABEL_IDX.indexOf(i)]}
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

// ── Features cards ────────────────────────────────────────────────────────────

const FEAT_BARS = [5840, 7180, 8440, 5320, 7840, 10140];

function MiniFeatBarChart() {
  const max = Math.max(...FEAT_BARS);
  return (
    <svg viewBox="0 0 120 36" className="w-full" aria-hidden="true">
      {FEAT_BARS.map((v, i) => {
        const bH = (v / max) * 30;
        return (
          <rect
            key={i}
            x={i * 20 + 2}
            y={36 - bH}
            width={14}
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

function MiniFeatBalanceTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-100 text-[9px]">
      {[
        { l: 'ACTIVO', v: '', h: true },
        { l: 'Caja y bancos', v: '32.840 €', h: false },
        { l: 'TOTAL ACTIVO', v: '83.800 €', h: true },
        { l: 'Patrimonio neto', v: '68.420 €', h: false },
      ].map((r, i) => (
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
    body: 'Gráficos de barras, líneas y sectores desde una pregunta en lenguaje natural.',
    visual: <MiniFeatBarChart />,
  },
  {
    emoji: '📥',
    title: 'Exports en un clic',
    body: 'Cualquier informe descargable en Excel, PDF y Word sin configurar nada.',
    visual: (
      <div className="flex justify-center gap-3 py-1">
        {[
          ['📗', 'Excel', 'bg-emerald-50 text-emerald-700'],
          ['📄', 'PDF', 'bg-red-50 text-red-600'],
          ['📝', 'Word', 'bg-blue-50 text-blue-700'],
        ].map(([ic, label, cls]) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium ${cls}`}
          >
            <span className="text-xl">{ic}</span>
            {label}
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: '⚖️',
    title: 'Balance y PyG',
    body: 'Balance de situación y cuenta de resultados al cierre del periodo que elijas.',
    visual: <MiniFeatBalanceTable />,
  },
  {
    emoji: '🔔',
    title: 'Alertas fiscales',
    body: 'D-15, D-7, D-3 y D-1 antes de cada vencimiento AEAT. Nunca olvidas Hacienda.',
    visual: (
      <div className="space-y-1">
        {[
          ['D-15', 'Modelo 303 · T2', 'bg-amber-50 text-amber-700'],
          ['D-7', 'Pago fraccionado 130', 'bg-orange-50 text-orange-700'],
          ['D-1', 'Modelo 111 · Mayo', 'bg-red-50 text-red-700'],
        ].map(([d, label, cls]) => (
          <div
            key={d}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[9px] font-medium ${cls}`}
          >
            <span className="font-bold">{d}</span>
            <span className="opacity-80">{label}</span>
          </div>
        ))}
      </div>
    ),
  },
];

const BENEFITS = [
  {
    icon: MessageSquare,
    title: 'Habla con tu Holded en español',
    body: 'Pregunta lo que necesites: facturas pendientes, top clientes, margen del trimestre. Isaak lee tu ERP y responde con datos reales — no inventados.',
  },
  {
    icon: Bell,
    title: 'No olvidas un vencimiento',
    body: 'Alertas automáticas por email 15, 7, 3 y 1 días antes de cada presentación AEAT (303, 130, 111…). Sin configurar nada.',
  },
  {
    icon: Brain,
    title: 'Corpus AEAT completo',
    body: 'Isaak conoce los reglamentos vigentes: IVA, IRPF, Sociedades, regímenes especiales. Cita normativa y BOE cuando hace falta. No es un chat genérico.',
  },
];

// PRICING data ahora vive en PricingSectionV1.tsx (cliente, con toggle
// mensual/anual). Se mantiene esta nota como referencia.

const FAQ = [
  {
    q: '¿Necesito tener Claude o ChatGPT?',
    a: 'No. La IA va incluida en Isaak — corre a nuestra cuenta. Tú solo necesitas tu cuenta de Isaak y tu API key de Holded.',
  },
  {
    q: '¿Qué modelo IA usa Isaak por dentro?',
    a: 'Claude (Anthropic) como primario y GPT-4o (OpenAI) como fallback automático. Si Claude tiene un incidente, GPT toma el relevo sin que tú lo notes.',
  },
  {
    q: '¿Isaak puede emitir facturas a la AEAT?',
    a: 'Isaak crea BORRADORES en tu Holded. La emisión y firma VeriFactu las hace Holded cuando tú apruebas el borrador. Es lo correcto: tú mantienes el control.',
  },
  {
    q: '¿Es seguro pasarle mi API key de Holded?',
    a: 'Sí. La key se cifra con AES-256-GCM antes de guardarse en nuestra base de datos. Solo viaja a Holded para hacer las consultas que tú pidas en el chat. Puedes revocarla en un click desde Ajustes.',
  },
  {
    q: '¿Qué pasa al acabar el trial?',
    a: 'Si decides no continuar con Pro, tu cuenta queda en plan Free (chat ilimitado, sin Holded). No te cobramos automáticamente — no pides tarjeta para el trial.',
  },
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí. Desde tu panel, sin llamar a soporte. La cancelación es inmediata y mantienes acceso hasta el final del periodo pagado.',
  },
];

export default function IsaakHomeLandingV1() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ── HEADER simple ────────────────────────────────────────────────── */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold text-[#011c67]">
            Isaak
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#pricing" className="text-slate-600 hover:text-[#2361d8]">
              Precios
            </a>
            <a href="#faq" className="text-slate-600 hover:text-[#2361d8]">
              FAQ
            </a>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
            >
              Empezar gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr,1.1fr]">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                <Sparkles className="h-3.5 w-3.5" />
                Isaak para Holded
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
                Tu asistente fiscal para Holded. Sin licencias IA.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Conecta tu Holded en 30 segundos. Pregunta lo que necesites. Recibe alertas antes de
                cada vencimiento de la AEAT. <strong>La IA va incluida</strong> — no necesitas
                Claude ni ChatGPT propios.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={SIGNUP_URL + '?plan=pro'}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
                >
                  Probar 14 días gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/tour"
                  className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/30 bg-white px-5 py-3.5 text-sm font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#2361d8]/5"
                >
                  Ver Isaak en acción
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Cancela cuando quieras
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  30 segundos para conectar Holded
                </span>
              </div>
            </div>

            {/* Hero mockup */}
            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ──────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Tres razones para probarlo
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Lo que la mayoría de pymes con Holded necesita y casi nadie tiene.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#2361d8]/10">
                  <Icon className="h-5 w-5 text-[#2361d8]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#011c67]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ──────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67]">Cómo funciona</h2>
            <p className="mt-3 text-base text-slate-600">
              Sin migrar datos, sin cambiar de software, sin curva de aprendizaje.
            </p>
          </div>

          <ol className="mt-10 space-y-5">
            {[
              {
                step: 1,
                icon: Lock,
                title: 'Crea tu cuenta',
                body: 'Email + contraseña o sign-in con Google. 30 segundos.',
              },
              {
                step: 2,
                icon: Plug,
                title: 'Pega tu API key de Holded',
                body: 'La generas en Holded → Configuración → Desarrolladores. La ciframos con AES-256.',
              },
              {
                step: 3,
                icon: MessageSquare,
                title: 'Empieza a preguntar',
                body: 'Probarlo es la mejor manera. Te sugerimos preguntas para arrancar.',
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <li
                key={step}
                className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-sm font-bold text-white">
                  {step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#2361d8]" />
                    <h3 className="text-base font-semibold text-[#011c67]">{title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── LO QUE ISAAK PUEDE HACER ─────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
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
            <Link
              href="/tour"
              className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
            >
              Ver todos los escenarios en acción
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <PricingSectionV1 />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <HelpCircle className="h-3 w-3" />
              Preguntas frecuentes
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67]">
              Lo que la gente nos pregunta
            </h2>
          </div>

          <dl className="mt-10 space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="text-sm font-semibold text-[#011c67]">{q}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Clock className="h-3 w-3" />
              14 días gratis · sin tarjeta
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Conecta tu Holded y empieza ahora.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-slate-600">
              Si en 14 días no ves valor, no te cobramos nada. Sin condiciones, sin letra pequeña.
            </p>
            <Link
              href={SIGNUP_URL + '?plan=pro'}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
            >
              Probar 14 días gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER simple ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Verifactu Business</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-slate-700">
              Términos
            </Link>
            <Link href="/privacy" className="hover:text-slate-700">
              Privacidad
            </Link>
            <a href="https://verifactu.business" className="hover:text-slate-700">
              verifactu.business
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
