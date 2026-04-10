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
  title: 'Isaak para Holded | Facturas, contactos y contabilidad en claro',
  description:
    'Consulta facturas, contactos, cuentas contables, diario y proyectos de Holded, y prepara borradores de factura con confirmacion.',
};

const problemPoints = [
  'No sabes que factura revisar primero.',
  'Te cuesta entender IVA, gastos y cobros.',
  'Pierdes tiempo saltando entre pantallas.',
  'Necesitas una explicacion clara antes de actuar.',
];

const everydayGoals = [
  'Saber que facturas revisar hoy.',
  'Entender mejor IVA y gastos.',
  'Preparar un borrador sin perder tiempo.',
];

const solutionExamples = [
  'Que facturas deberia revisar hoy para proteger caja?',
  'Ensename los contactos con mas riesgo de cobro.',
  'Explicame el diario de esta semana en lenguaje claro.',
  'Prepara un borrador de factura para este cliente.',
];

const whatItDoes = [
  'Consultar facturas emitidas y entender su estado.',
  'Revisar contactos, cuentas contables y libro diario.',
  'Preparar borradores de factura con confirmacion.',
  'Leer mejor IVA, gastos y caja desde el contexto contable.',
  'Ordenar proyectos y tareas para priorizar trabajo.',
];

const faqItems = [
  {
    question: '¿Que necesito para empezar?',
    answer:
      'Tu correo y una API key activa de Holded. Validamos la conexion durante el alta para que no entres a ciegas.',
  },
  {
    question: '¿Tengo que pagar ahora?',
    answer: 'No. Esta version revisada es gratuita y no muestra planes de pago dentro del flujo.',
  },
  {
    question: '¿Que pasa si la API key falla?',
    answer: 'Te lo decimos al momento y puedes pegar otra sin salir del onboarding.',
  },
  {
    question: '¿Que puede hacer ahora mismo?',
    answer:
      'Consultar facturas, contactos, cuentas contables, movimientos del diario, proyectos y tareas, y preparar borradores de factura con confirmacion.',
  },
  {
    question: '¿Puede cambiar mis datos?',
    answer:
      'Solo prepara borradores de factura cuando tu lo confirmas. El resto del beta publico se mantiene en lectura guiada.',
  },
  {
    question: '¿Que no conviene esperar todavia?',
    answer:
      'Este beta publico no promete productos, usuarios, adjuntos, conciliacion bancaria ni documentos como presupuestos, pedidos o albaranes.',
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
                Para usuarios de Holded
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.4rem] sm:leading-[1.02]">
                Facturas, contactos y contabilidad de Holded en lenguaje claro
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Isaak ya puede revisar facturas, contactos, cuentas contables, diario y proyectos, y
                preparar borradores de factura con confirmacion sin obligarte a pelearte con menus
                ni tecnicismos.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildRegisterUrl('holded_home_primary')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
                >
                  Conectar Holded en 1 minuto
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
                <div className="text-sm font-semibold text-slate-900">Empieza en un minuto</div>
                <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                  Solo te hara falta tu correo y una API key activa de Holded. Validamos la conexion
                  al momento y te dejamos claro desde el principio lo que esta disponible hoy.
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
                Lo importante ya lo puedes pedir hablando normal
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Lectura clara para el dia a dia y una unica accion de escritura: preparar borradores
                de factura con tu confirmacion.
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
                  Conectar Holded en 1 minuto
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
                Lo que ya puedes consultar hoy en Holded
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
                El asistente
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Todo esto lo hace Isaak
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Isaak te ayuda a leer mejor IVA, gastos y parte de la caja a partir del contexto
                contable que ya existe en Holded.
              </p>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">
                  No sustituye a tu asesor ni promete mas de lo que hay hoy
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  El beta publico se centra en facturas, contactos, contabilidad y proyectos. No
                  prometemos productos, usuarios, adjuntos ni conciliacion bancaria en esta fase.
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
