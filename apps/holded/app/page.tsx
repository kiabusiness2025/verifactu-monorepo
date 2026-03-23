import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';

const HOLDED_APP_URL = 'https://app.verifactu.business';
const HOLDED_CHAT_URL = `${HOLDED_APP_URL}/dashboard/isaak`;
const buildOnboardingUrl = (source: string) =>
  `${HOLDED_APP_URL}/onboarding/holded?channel=chatgpt&source=${source}&next=${encodeURIComponent(HOLDED_CHAT_URL)}`;

export const metadata: Metadata = {
  title: 'Isaak para Holded | Control claro de tu negocio',
  description:
    'Conecta Holded y pregunta en lenguaje natural por ventas, gastos y beneficio sin perder tiempo.',
};

const benefits = [
  'Respuestas claras sobre ventas, gastos y beneficio.',
  'Lectura continua de la actividad para detectar riesgos.',
  'Siguientes pasos concretos sin rodeos.',
  'Inicio en minutos con tu API key de Holded.',
];

export default function HoldedHomePage() {
  return (
    <main className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Isaak para Holded"
                width={22}
                height={22}
                className="h-[22px] w-[22px] object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-[1.18rem] font-semibold text-slate-900">Isaak para Holded</div>
              <div className="text-sm font-medium text-slate-600">Asistente contable</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
            <Link href="#beneficios" className="hover:text-slate-900">
              Beneficios
            </Link>
            <Link href="/planes" className="hover:text-slate-900">
              Planes
            </Link>
            <Link href="/support" className="hover:text-slate-900">
              Soporte
            </Link>
          </nav>

          <Link
            href={buildOnboardingUrl('holded_home_nav')}
            className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
          >
            Conectar cuenta
          </Link>
        </div>
      </header>

      <section id="solucion" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-[#ff5460]" />
            Claridad diaria
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Habla con tus números.
            <br />
            Decide con calma.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Isaak convierte tus datos de Holded en respuestas directas para que tengas control real de
            tu negocio: qué vendes, qué gastas y cuánto beneficio te queda.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={buildOnboardingUrl('holded_home_hero')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654]"
            >
              Empezar ahora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/planes"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              Ver planes
            </Link>
          </div>

          <div className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-900">Qué necesitas para conectar</div>
            <div className="mt-3 flex items-start gap-2 text-sm text-amber-800">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              Una cuenta activa de Holded y tu API key.
            </div>
          </div>
        </div>

        <HoldedHeroVisual />
      </section>

      <section id="beneficios" className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Lo que cambia desde el primer día</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {benefits.map((item) => (
              <article key={item} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        Powered by{' '}
        <a
          href="https://verifactu.business"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-slate-800"
        >
          verifactu.business
        </a>
      </footer>
    </main>
  );
}
