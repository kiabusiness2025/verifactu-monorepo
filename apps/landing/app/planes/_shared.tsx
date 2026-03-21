import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import {
  EXCESS_TEXT_LINES,
  EXCESS_TEXT_TITLE,
  getPlanCheckoutHref,
  type PlanInfo,
} from '../lib/plans';

const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Qué es Isaak', href: '/que-es-isaak' },
  { label: 'Holded', href: '/holded' },
  { label: 'Planes', href: '/planes' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const DETAIL_POINTS_BY_PLAN: Record<PlanInfo['id'], string[]> = {
  basico: [
    'Pensado para empezar con orden diario sin sobrecargar procesos.',
    'Te enfoca en emisión, registro y visibilidad básica con Isaak siempre disponible.',
    'Si creces en volumen o necesitas más coordinación, puedes subir a PYME o Empresa sin rehacer tu forma de trabajar.',
  ],
  pyme: [
    'Mejora el seguimiento diario cuando ya hay más facturas, más tareas y más movimiento.',
    'Isaak ayuda a priorizar cobros, gastos y pendientes para que el equipo no pierda foco.',
    'Es el salto natural desde Básico cuando necesitas más capacidad sin complejidad adicional.',
  ],
  empresa: [
    'Añade una base más sólida para operaciones con asesoría y procesos internos más exigentes.',
    'Incluye integración contable vía API cuando tu herramienta lo permite.',
    'Mantiene a Isaak como capa de criterio para traducir información en decisiones concretas.',
  ],
  pro: [
    'Diseñado para volúmenes altos y equipos que no pueden permitirse fricción operativa.',
    'Refuerza capacidad, continuidad y acompañamiento para momentos de carga alta.',
    'Es la opción para cuando la operación exige velocidad y control sostenido.',
  ],
};

export function PlanPageTemplate({
  title,
  subtitle,
  plan,
}: {
  title: string;
  subtitle: string;
  plan: PlanInfo;
}) {
  const checkoutHref = getPlanCheckoutHref(plan);
  const detailPoints = DETAIL_POINTS_BY_PLAN[plan.id];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Plan {plan.name}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">{subtitle}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={checkoutHref}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Empezar prueba de este plan
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ver demo guiada antes
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-[#011c67]">Para quién es</h2>
                <p className="mt-2 text-sm text-slate-600">{plan.audience}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-[#011c67]">Límite de facturas</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Hasta {plan.includedInvoices} facturas/mes
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#011c67]">Qué incluye</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {plan.includes.map((line) => (
                  <li key={line}>- {line}</li>
                ))}
                {plan.hasAccountingIntegration ? (
                  <li>- Integración contable (si tiene API)</li>
                ) : null}
              </ul>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#011c67]">{EXCESS_TEXT_TITLE}</h2>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {EXCESS_TEXT_LINES.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#011c67]">Cómo funciona este plan en la práctica</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {detailPoints.map((line) => (
                  <li key={line}>- {line}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/precios"
                  className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-5 py-2.5 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                >
                  Comparar con otros planes
                </Link>
                <Link
                  href="/recursos/contacto"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Resolver dudas con el equipo
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] p-5">
              <h2 className="text-sm font-semibold text-[#011c67]">Acceso inicial para nuevos usuarios</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>- Al registrarte se crea acceso automático a Empresa Demo SL, ya integrada con Holded, sin caducidad.</li>
                <li>- Desde dashboard e Isaak te iremos proponiendo pasar a datos reales cuando estés listo.</li>
                <li>- La prueba de 30 días permite crear 1 empresa con tus datos para validar tu operativa real antes de contratar.</li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={checkoutHref}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Activar prueba real de 30 días
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Crear cuenta y entrar en Demo SL
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
