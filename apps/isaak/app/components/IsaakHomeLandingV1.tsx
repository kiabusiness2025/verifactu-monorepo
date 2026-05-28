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

export const isaakLandingV1Metadata: Metadata = {
  title: 'Isaak — Asistente fiscal y contable para Holded',
  description:
    'Conecta tu Holded en 30 segundos. Pregunta lo que necesites. Recibe alertas antes de cada vencimiento. IA incluida — sin licencia Claude ni ChatGPT propia. Prueba 14 días gratis sin tarjeta.',
};

const SIGNUP_URL = '/signup';

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

const PRICING = [
  {
    name: 'Free',
    price: '0 €',
    priceSub: 'siempre gratis',
    description: 'Chat con corpus AEAT. Sin tu Holded conectado, sin tools de lectura.',
    features: [
      'Chat ilimitado (10 mensajes/h)',
      'Corpus completo de AEAT',
      'Sin necesidad de tarjeta',
      'Sin Holded conectado',
    ],
    cta: { label: 'Empezar gratis', href: SIGNUP_URL },
    highlight: false,
  },
  {
    name: 'Pro',
    price: '29 €',
    priceSub: 'al mes · IVA no incluido',
    description: 'Todo lo que un autónomo o pyme necesita para que Holded vuele.',
    features: [
      'Todo lo del plan Free',
      'Tu Holded conectado',
      '20 tools: lectura + crear borradores',
      'Alertas AEAT D-15/7/3/1 por email',
      'Soporte por email',
      'Trial 14 días sin tarjeta',
    ],
    cta: { label: 'Probar 14 días gratis', href: SIGNUP_URL + '?plan=pro' },
    highlight: true,
  },
];

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
      <section className="bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Sparkles className="h-3.5 w-3.5" />
            Isaak para Holded
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
            Tu asistente fiscal para Holded. Sin licencias IA.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Conecta tu Holded en 30 segundos. Pregunta lo que necesites. Recibe alertas antes de
            cada vencimiento de la AEAT. <strong>La IA va incluida</strong> — no necesitas Claude
            ni ChatGPT propios.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={SIGNUP_URL + '?plan=pro'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
            >
              Probar 14 días gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Ver precios
            </a>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
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

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Precios sin sorpresas
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Dos planes. Cambia o cancela cuando quieras desde tu panel.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-3xl border-2 p-7 shadow-sm ${
                  p.highlight
                    ? 'border-[#2361d8] bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold text-[#011c67]">{p.name}</h3>
                  {p.highlight && (
                    <span className="inline-block rounded-full bg-[#2361d8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                      Recomendado
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-[#011c67]">{p.price}</span>
                  <span className="ml-2 text-sm text-slate-500">{p.priceSub}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{p.description}</p>

                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.cta.href}
                  className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${
                    p.highlight
                      ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {p.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Anual: 290 € /año (equivale a 24,16 €/mes · ahorro del 20%)
          </p>
        </div>
      </section>

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
              <div
                key={q}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
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
              Si en 14 días no ves valor, no te cobramos nada. Sin condiciones, sin letra
              pequeña.
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
