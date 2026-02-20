import Link from "next/link";
import Header from "../components/Header";
import { Container, Footer } from "../lib/home/ui";
import {
  EXCESS_TEXT_LINES,
  EXCESS_TEXT_TITLE,
  type PlanInfo,
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

export function PlanPageTemplate({
  title,
  subtitle,
  plan,
}: {
  title: string;
  subtitle: string;
  plan: PlanInfo;
}) {
  const appUrl = getAppUrl();

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

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-[#011c67]">Para quién es</h2>
                <p className="mt-2 text-sm text-slate-600">{plan.audience}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-[#011c67]">Límite de facturas</h2>
                <p className="mt-2 text-sm text-slate-600">Hasta {plan.includedInvoices} facturas/mes</p>
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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Empezar gratis (para siempre)
              </Link>
              <Link
                href="/planes"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ver todos los planes
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
