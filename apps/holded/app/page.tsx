import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';
import { buildAuthUrl, buildRegisterUrl } from './lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Isaak para Holded | Onboarding gratuito',
  description:
    'Conecta Holded gratis, valida tu API key al momento y entra directamente al dashboard con Isaak.',
};

const benefits = [
  'Alta rápida con correo y confirmación.',
  'Onboarding guiado sin pasos técnicos raros.',
  'Validación inmediata de la API key de Holded.',
  'Dashboard y primer chat en el mismo producto.',
];

const faqItems = [
  {
    question: '¿Qué necesito para empezar?',
    answer: 'Solo tu correo y una API key activa de Holded.',
  },
  {
    question: '¿Tengo que pagar ahora?',
    answer: 'No. Este flujo es para la versión gratuita y no muestra planes de pago.',
  },
  {
    question: '¿Qué pasa si la API key falla?',
    answer: 'Te lo decimos al momento y puedes pegar otra sin salir del onboarding.',
  },
  {
    question: '¿Después dónde entro?',
    answer: 'Directamente a tu dashboard de Holded con el primer chat listo.',
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
                Flujo gratuito
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.35rem] sm:leading-[1.04]">
                Conecta Holded y empieza a usar Isaak sin fricción.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                El recorrido ahora es simple: alta, verificación, onboarding, API key, validación y
                dashboard. Todo dentro de `holded.verifactu.business`.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildRegisterUrl('holded_home_primary')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
                >
                  Empezar gratis
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
                <div className="text-sm font-semibold text-slate-900">Qué vas a necesitar</div>
                <div className="mt-4 flex items-start gap-2 text-sm text-slate-700">
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
                Versión gratuita
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Un onboarding pensado para llegar al dashboard cuanto antes
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {benefits.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Cómo funciona</h3>
              <ol className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. Creas tu acceso.</li>
                <li>2. Confirmas tu correo.</li>
                <li>3. Pegas tu API key de Holded.</li>
                <li>4. La validamos y te llevamos al dashboard.</li>
                <li>5. Arrancas tu primer chat con Isaak.</li>
              </ol>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={buildRegisterUrl('holded_home_card_register')}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Crear acceso gratis
                </Link>
                <Link
                  href={buildAuthUrl('holded_home_card_login')}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Iniciar sesión
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="beneficios" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-[#ff5460]" />
                Claro y simple
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Sin planes visibles y sin ruido
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                La experiencia pública de Holded queda centrada en la versión gratuita. Lo premium
                se deja fuera del flujo principal por ahora.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Preguntas rápidas</h2>
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
