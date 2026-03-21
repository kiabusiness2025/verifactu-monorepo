import Link from 'next/link';
import Header from '../components/Header';
import PricingCalculatorInline from '../components/PricingCalculatorInline';
import { Container, Footer } from '../lib/home/ui';
import { EXCESS_TEXT_LINES, EXCESS_TEXT_TITLE, getPlanCheckoutHref, PLAN_LIST } from '../lib/plans';

const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Qué es Isaak', href: '/que-es-isaak' },
  { label: 'Holded', href: '/holded' },
  { label: 'Planes', href: '/planes' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const comparisonRows = [
  {
    label: 'Emision y registro VeriFactu',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  {
    label: 'Isaak para contexto fiscal y operativo',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  {
    label: 'Export AEAT y Excel',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  {
    label: 'Control diario de ventas, gastos y beneficio',
    values: ['Basico', 'Reforzado', 'Completo', 'Completo'],
  },
  {
    label: 'Integracion contable via API',
    values: ['No', 'No', 'Si', 'Si'],
  },
  {
    label: 'Soporte y prioridad operativa',
    values: ['Estándar', 'Estándar', 'Prioritario', 'Prioritario'],
  },
];

const featureBlocks = [
  {
    title: 'Cumplimiento y trazabilidad',
    lines: [
      'Emision y registro preparados para VeriFactu.',
      'Visibilidad diaria del estado de tus documentos y cierres.',
      'Exportes claros para trabajar con asesoría sin fricción.',
    ],
  },
  {
    title: 'Control operativo real',
    lines: [
      'Ventas, gastos, cobros y beneficio en un mismo flujo.',
      'Isaak traduce datos contables a decisiones y siguientes pasos.',
      'Menos menús técnicos y más contexto empresarial accionable.',
    ],
  },
  {
    title: 'Integraciones y escalado',
    lines: [
      'Conexión API con tu programa contable en Empresa y Pro.',
      'Base preparada para integraciones verticales como Holded.',
      'Soporte creciente según complejidad operativa y volumen.',
    ],
  },
];

export default function PreciosPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Precios Verifactu Business
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Precios claros para cumplir, controlar y escalar con Isaak
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Empieza con control diario y cumplimiento VeriFactu. Sube a Empresa o Pro cuando
              necesites integración contable, más volumen y una operación más avanzada.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/planes"
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1f55c0]"
              >
                Ver detalle completo por plan
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Probar la demo primero
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-4 text-left lg:grid-cols-4">
            {PLAN_LIST.map((plan) => (
              <article
                key={plan.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {plan.name}
                </div>
                <div className="mt-3 text-4xl font-bold text-[#011c67]">{plan.priceEur} EUR</div>
                <div className="text-sm text-slate-500">/mes</div>
                <div className="mt-4 text-sm font-medium text-slate-700">{plan.audience}</div>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  <li>Hasta {plan.includedInvoices} facturas al mes</li>
                  {plan.includes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  <li>
                    {plan.hasAccountingIntegration
                      ? 'Integración contable vía API'
                      : 'Sin integración API contable'}
                  </li>
                </ul>
                <div className="mt-6 flex flex-col gap-2">
                  <Link
                    href={`/planes/${plan.id}`}
                    className="inline-flex justify-center rounded-full border border-[#2361d8] px-4 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                  >
                    Ver detalle
                  </Link>
                  <Link
                    href={getPlanCheckoutHref(plan)}
                    className="inline-flex justify-center rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f55c0]"
                  >
                    Probar gratis 30 días
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-slate-200 bg-[linear-gradient(140deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#011c67]">
              Acceso inicial y salto a datos reales
            </h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  1. Registro
                </div>
                <p className="mt-2">
                  Todos los usuarios registrados entran con acceso automático a Empresa Demo SL, ya
                  integrada con Holded, sin límite de tiempo.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  2. Activación guiada
                </div>
                <p className="mt-2">
                  Desde el dashboard e Isaak se irá proponiendo pasar a una cuenta con datos reales
                  cuando detectemos intención de uso productivo.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  3. Prueba real
                </div>
                <p className="mt-2">
                  La prueba de 30 días habilita crear 1 empresa con tus propios datos para validar
                  flujo real antes de elegir plan definitivo.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1f55c0]"
              >
                Crear cuenta y entrar en Demo SL
              </Link>
              <Link
                href="/holded"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ver compatibilidad Holded
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#011c67]">Comparativa rápida</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">
                      Característica
                    </th>
                    {PLAN_LIST.map((plan) => (
                      <th
                        key={plan.id}
                        className="border-b border-slate-200 px-4 py-3 font-semibold text-[#011c67]"
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
                        {row.label}
                      </td>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.label}-${index}`}
                          className="border-b border-slate-100 px-4 py-3 text-slate-600"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl gap-4 lg:grid-cols-3">
            {featureBlocks.map((block) => (
              <article
                key={block.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="text-lg font-semibold text-[#011c67]">{block.title}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {block.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-14 max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#011c67]">{EXCESS_TEXT_TITLE}</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {EXCESS_TEXT_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <PricingCalculatorInline />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={getPlanCheckoutHref(PLAN_LIST[0])}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1f55c0]"
              >
                Empezar prueba real de 30 días
              </Link>
              <Link
                href="/recursos/contacto"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Resolver dudas antes de contratar
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
