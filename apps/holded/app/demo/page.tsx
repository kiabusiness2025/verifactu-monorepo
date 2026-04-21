import { CheckCircle2, PlayCircle, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import DemoRequestForm from '../components/DemoRequestForm';

export const metadata: Metadata = {
  title: 'Demo guiada | Holded',
  description:
    'Solicita una demo guiada del conector Holded. Compartenos tu contexto y preparamos una sesion util con datos reales de tu empresa.',
};

const whatYouGet = [
  'Revision del encaje real con tu operativa y tu uso actual de Holded.',
  'Demo enfocada en facturacion, contabilidad, cobros, gastos o proyectos segun tu caso.',
  'Siguiente paso claro: onboarding directo, prueba guiada o soporte de activacion.',
];

const prepItems = [
  'Tus datos de contacto y rol dentro de la empresa.',
  'Datos basicos de empresa para que la sesion no empiece a ciegas.',
  'El objetivo que quieres validar en la prueba.',
];

export default function HoldedDemoPage() {
  return (
    <main className="page-enter min-h-screen py-12 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] p-8 shadow-[0_32px_80px_-58px_rgba(15,23,42,0.55)] sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              <PlayCircle className="h-3.5 w-3.5" />
              Solicitud de demo
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3rem] sm:leading-[1.02]">
              Pruebalo con datos reales de tu empresa.
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              Compartenos tu contexto y preparamos una sesion util, no una demo generica. Cuanto
              mejor entendemos tu caso, mas valor sacas en 30 minutos.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-[#ff5460]" />
                  Que te llevas
                </div>
                <ul className="mt-4 space-y-3">
                  {whatYouGet.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
                  Lo que te pedimos aqui
                </div>
                <ul className="mt-4 space-y-3">
                  {prepItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#ff5460]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo-recording"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver demo grabada
              </Link>
              <Link
                href="/acceso"
                className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
              >
                Solicitar acceso anticipado
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-58px_rgba(15,23,42,0.55)] sm:p-10">
            <div className="mb-6">
              <div className="text-sm font-semibold text-slate-900">
                Demo gratuita personalizada
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Te contactamos en 24 horas para confirmar fecha y preparar la sesion con tu
                contexto.
              </p>
            </div>
            <DemoRequestForm source="holded_demo_page" />
          </section>
        </div>
      </div>
    </main>
  );
}
