import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';
import { buildAuthUrl, buildRegisterUrl } from './lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Isaak para Holded | Gestiona tu negocio sin complicaciones',
  description:
    'Gestiona tu negocio en Holded sin complicaciones. Pregunta, entiende tus numeros y conecta tu cuenta gratis en minutos.',
};

const problemPoints = [
  'No sabes donde mirar.',
  'No entiendes bien los numeros.',
  'Te cuesta encontrar informacion.',
  'Dependes de tu asesor para casi todo.',
];

const everydayGoals = ['Saber cuanto ganas.', 'Saber que debes.', 'Hacer facturas rapido.'];

const solutionExamples = [
  '¿Cuanto he vendido este mes?',
  '¿Que gastos tengo pendientes?',
  'Hazme una factura para este cliente.',
  '¿Esto es deducible?',
];

const whatItDoes = [
  'Consultar ingresos y gastos.',
  'Crear facturas y presupuestos.',
  'Encontrar informacion en segundos.',
  'Entender mejor tu situacion financiera.',
  'Resolver dudas fiscales basicas.',
];

const faqItems = [
  {
    question: '¿Que necesito para empezar?',
    answer: 'Solo tu correo y una API key activa de Holded.',
  },
  {
    question: '¿Tengo que pagar ahora?',
    answer: 'No. Esta primera version es gratuita y no muestra planes de pago.',
  },
  {
    question: '¿Que pasa si la API key falla?',
    answer: 'Te lo decimos al momento y puedes pegar otra sin salir del onboarding.',
  },
  {
    question: '¿Que puedo consultar?',
    answer:
      'Ingresos, gastos, facturas, clientes, resultados y movimientos registrados en tu cuenta.',
  },
];

export default function HoldedHomePage() {
  return (
    <main className="min-h-screen text-slate-900">
      <section id="solucion" className="py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#ff5460]" />
                Isaak para Holded
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.4rem] sm:leading-[1.02]">
                Gestiona tu negocio en Holded sin complicaciones
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Holded es potente, pero no siempre esta hecho para pensar como tu. No necesitas
                aprender contabilidad ni navegar por menus. Solo tienes que preguntar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildRegisterUrl('holded_home_primary')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
                >
                  Conecta tu Holded gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={buildAuthUrl('holded_home_secondary')}
                  className="inline-flex items-center justify-center rounded-xl border border-[#ff5460]/40 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ya tengo acceso
                </Link>
              </div>

              <div className="mt-8 rounded-3xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Que vas a necesitar</div>
                <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                  Una API key activa de Holded. La validamos al momento y te damos feedback claro si
                  algo no cuadra.
                </div>
              </div>
            </div>

            <HoldedHeroVisual />
          </div>
        </div>
      </section>

      <section id="acceso-libre" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] p-6 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                El problema
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Usar Holded no siempre es tan facil como deberia
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {problemPoints.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">
                  Y al final solo quieres algo simple
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {everydayGoals.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                La solucion
              </div>
              <h3 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Ahora puedes gestionar todo hablando como siempre
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Sin menus. Sin complicaciones. Sin conocimientos tecnicos.
              </p>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageCircleMore className="h-4 w-4 text-[#ff5460]" />
                  Preguntas y listo
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {solutionExamples.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={buildRegisterUrl('holded_home_card_register')}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Conecta tu Holded gratis
                </Link>
                <Link
                  href={buildAuthUrl('holded_home_card_login')}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Iniciar sesion
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="beneficios" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-[#ff5460]" />
                Todo conectado con tu cuenta de Holded
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Accede a tu informacion en segundos y entiende mejor tu negocio
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {whatItDoes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[2rem] border border-[#ff5460]/15 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] p-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                Tu asistente inteligente
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Todo esto lo hace Isaak
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Isaak entiende como funciona tu negocio y te responde en lenguaje normal.
              </p>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">
                  No sustituye a tu asesor, pero te ayuda en el dia a dia
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Te da respuestas inmediatas para revisar ventas, gastos, clientes, facturas y
                  prioridades sin depender de menus ni de tareas repetitivas.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Preguntas rapidas</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Todo lo necesario para empezar sin perder tiempo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
