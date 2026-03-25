import { ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildOnboardingUrl } from '../lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Capacidades reales | Isaak para Holded',
  description:
    'Resumen de lo que Isaak ya puede hacer con datos de Holded dentro del flujo gratuito actual.',
};

const availableCapabilities = [
  {
    title: 'Facturas y documentos',
    points: [
      'Revisar facturas y su estado para detectar cobros en riesgo.',
      'Explicar una factura concreta en lenguaje claro.',
      'Preparar borradores cuando el usuario confirma la accion.',
    ],
  },
  {
    title: 'Clientes y contactos',
    points: [
      'Listar contactos para preparar seguimiento comercial y de cobro.',
      'Consultar un cliente concreto para entender su contexto.',
      'Relacionar clientes y facturas para priorizar accion operativa.',
    ],
  },
  {
    title: 'Caja y operacion',
    points: [
      'Revisar cuentas y actividad del negocio.',
      'Traducir datos en riesgos y siguientes pasos.',
      'Ayudarte a ordenar el trabajo diario con foco en caja y beneficio.',
    ],
  },
  {
    title: 'Proyectos y tareas',
    points: [
      'Listar proyectos para ver carga y contexto operativo.',
      'Analizar tareas para detectar bloqueos.',
      'Cruzar agenda y tiempos para priorizar ejecucion.',
    ],
  },
];

const workingPrompts = [
  'Que facturas deberia revisar hoy para proteger caja?',
  'Que clientes me conviene contactar primero esta semana?',
  'Resumeme en 5 lineas los proyectos con mas riesgo.',
  'Que tareas deberia cerrar hoy para evitar retrasos?',
  'Dame un plan de accion con 3 prioridades y orden de ejecucion.',
];

const currentLimits = [
  'Isaak no inventa datos: trabaja con lo que realmente existe en tu entorno.',
  'Cuando una accion cambia informacion, pide confirmacion antes de ejecutarla.',
  'Si falta contexto para una recomendacion fiable, te pedira el minimo dato necesario.',
];

export default function HoldedCapabilitiesPage() {
  return (
    <main className="min-h-screen py-14 text-slate-900">
      <section>
        <div className="mx-auto max-w-6xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
            Capacidad actual
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-[3rem] sm:leading-[1.06]">
            Lo que Isaak ya puede hacer hoy con Holded
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Esta pagina resume capacidad real ya disponible. El objetivo es simple: que sepas que
            puedes pedirle ahora mismo para ahorrar tiempo y decidir mejor.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-2">
          {availableCapabilities.map((group) => (
            <article
              key={group.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-[#ff5460]" />
                <h2 className="text-lg font-semibold">{group.title}</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {group.points.map((point) => (
                  <li
                    key={point}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-[#ff5460]/20 bg-[#ff5460]/5 p-7 lg:p-9">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Prompts utiles para empezar
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Si le das objetivo, plazo y foco, Isaak responde con mas precision y accion.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {workingPrompts.map((prompt) => (
                <div
                  key={prompt}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                >
                  {prompt}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7 lg:p-9">
            <div className="flex items-center gap-2 text-amber-900">
              <CircleAlert className="h-4 w-4" />
              <h2 className="text-xl font-bold tracking-tight">Limites sanos para decidir bien</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {currentLimits.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-amber-200 bg-white p-4 text-sm leading-6 text-amber-900"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Listo para probarlo con tu operacion real
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Conecta Holded, valida tu API key y entra al dashboard para arrancar el primer chat.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={buildOnboardingUrl('holded_capabilities_cta')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
              >
                Conectar Holded ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ir al dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
