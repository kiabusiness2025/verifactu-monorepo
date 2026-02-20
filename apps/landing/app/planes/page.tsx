import Link from "next/link";
import Header from "../components/Header";
import PricingCalculatorInline from "../components/PricingCalculatorInline";
import { Container, Footer } from "../lib/home/ui";
import {
  EXCESS_TEXT_LINES,
  EXCESS_TEXT_TITLE,
  PLAN_LIST,
} from "../lib/plans";
import { getAppUrl } from "../lib/urls";

const navLinks = [
  { label: "Inicio", href: "/#hero" },
  { label: "Para quién", href: "/#para-quien" },
  { label: "Dashboard", href: "/#dashboard" },
  { label: "Planes", href: "/planes" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contacto", href: "/recursos/contacto" },
];

export default function PlanesPage() {
  const appUrl = getAppUrl();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Planes claros para cumplir y tener control
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Todos incluyen VeriFactu + gastos + export Excel. En Empresa y Pro añadimos
              integración contable (si tu software tiene API).
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-4 text-left lg:grid-cols-4">
            {PLAN_LIST.map((plan) => (
              <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {plan.name}
                </div>
                <div className="mt-3 text-3xl font-bold text-[#011c67]">{plan.priceEur} EUR</div>
                <div className="text-sm text-slate-500">/mes</div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>Hasta {plan.includedInvoices} facturas/mes</li>
                  {plan.includes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  <li>
                    {plan.hasAccountingIntegration
                      ? "Integración contable (si tiene API)"
                      : "Sin integración contable"}
                  </li>
                </ul>
                <Link
                  href={`/planes/${plan.id}`}
                  className="mt-5 inline-flex rounded-full border border-[#2361d8] px-4 py-2 text-xs font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                >
                  Ver plan
                </Link>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#011c67]">{EXCESS_TEXT_TITLE}</h2>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {EXCESS_TEXT_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl justify-center">
            <PricingCalculatorInline />
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={appUrl}
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
            >
              Empezar gratis (para siempre)
            </Link>
            <Link
              href="/#planes"
              className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Volver al inicio
            </Link>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
