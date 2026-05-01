import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Info } from 'lucide-react';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import { getPlanCheckoutHref, PLAN_LIST } from '../lib/plans';

export const metadata: Metadata = {
  title: 'Suscripciones | Verifactu Business',
  description:
    'Planes claros para cumplir con VeriFactu y tener control de tu empresa. Desde 19 EUR/mes.',
  openGraph: {
    title: 'Suscripciones | Verifactu Business',
    description:
      'Planes claros para cumplir con VeriFactu y tener control de tu empresa. Desde 19 EUR/mes.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/suscripciones',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Suscripciones', href: '/suscripciones' },
  { label: 'Developers', href: '/developers' },
  { label: 'Contacto', href: '/contacto' },
];

const included = [
  'Emision y registro VeriFactu',
  'Isaak para contexto fiscal y operativo',
  'Export AEAT y Excel',
];

const comparisonRows = [
  {
    label: 'Emision y registro VeriFactu',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  {
    label: 'Isaak para contexto fiscal',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  { label: 'Export AEAT y Excel', values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'] },
  {
    label: 'Control diario ventas/gastos/beneficio',
    values: ['Basico', 'Reforzado', 'Completo', 'Completo'],
  },
  {
    label: 'Integracion contable via API',
    values: ['No', 'No', 'Si', 'Si'],
  },
  {
    label: 'Soporte y prioridad operativa',
    values: ['Estandar', 'Estandar', 'Prioritario', 'Prioritario'],
  },
];

export default function SuscripcionesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-14">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Planes claros para cumplir y tener control
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Todos incluyen VeriFactu + gastos + exportacion Excel. En Empresa y Pro se añade
              integracion contable con API.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {included.map((i) => (
                <span key={i} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {i}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Plans */}
      <section className="py-14">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_LIST.map((plan, idx) => {
              const isHighlighted = idx === 2; // Empresa
              return (
                <article
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    isHighlighted
                      ? 'border-[#2361d8] shadow-lg shadow-[#2361d8]/10 ring-1 ring-[#2361d8]/20'
                      : 'border-slate-200 shadow-sm'
                  } bg-white`}
                >
                  {isHighlighted && (
                    <div className="mb-3 inline-flex self-start rounded-full bg-[#2361d8] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      Mas popular
                    </div>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {plan.audience}
                  </div>
                  <div className="mt-2 text-xl font-bold text-[#011c67]">{plan.name}</div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-3xl font-bold text-[#011c67]">{plan.priceEur}€</span>
                    <span className="mb-1 text-sm text-slate-500">/mes</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {plan.includedInvoices} facturas incluidas
                  </div>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                    {plan.hasAccountingIntegration && (
                      <li className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        Integracion contable via API
                      </li>
                    )}
                  </ul>
                  <Link
                    href={getPlanCheckoutHref(plan)}
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-full py-2.5 text-sm font-semibold transition ${
                      isHighlighted
                        ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                        : 'border border-[#2361d8] text-[#2361d8] hover:bg-[#2361d8]/5'
                    }`}
                  >
                    Empezar con {plan.name}
                  </Link>
                </article>
              );
            })}
          </div>

          {/* Excess note */}
          <div className="mt-8 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              Si necesitas emitir mas facturas de las incluidas en tu plan, puedes seguir facturando
              sin bloqueos. El exceso se calcula al final del mes con descuento por volumen y
              aparece en tu siguiente factura junto con la cuota del plan.{' '}
              <Link
                href="/politica-de-precios"
                className="font-medium text-[#2361d8] hover:underline"
              >
                Ver politica de precios completa
              </Link>
            </p>
          </div>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="border-t border-slate-100 py-14">
        <Container>
          <h2 className="text-xl font-bold text-[#011c67] sm:text-2xl">Comparativa de planes</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Caracteristica
                  </th>
                  {PLAN_LIST.map((p) => (
                    <th
                      key={p.id}
                      className="px-4 py-3 text-center text-xs font-semibold text-slate-500"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {v === 'Incluido' || v === 'Si' ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : v === 'No' ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className="text-xs text-slate-600">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              ¿Tienes dudas sobre que plan elegir?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Hablamos contigo para encontrar la opcion correcta sin presion.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Hablar con el equipo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
