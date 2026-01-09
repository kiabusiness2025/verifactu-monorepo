import React from "react";
import Link from "next/link";
import Header from "../components/Header";
import { DemoLeadForm } from "./DemoLeadForm";
import { PRICING_PLANS } from "../lib/home/data";

function PriceDisplay({ price }: { price: number | null }) {
  if (price === null) return <span className="text-3xl font-bold text-slate-900">A medida</span>;
  if (price === 0) return <span className="text-3xl font-bold text-slate-900">Gratis</span>;

  const formatted = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold text-slate-900">{formatted}</span>
      <span className="pb-1 text-sm font-semibold text-slate-500">/ mes</span>
    </div>
  );
}

export default function DemoPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appUrl =
    configuredAppUrl ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://app.verifactu.business");
  const demoHref = appUrl ? `${appUrl.replace(/\/$/, "")}/demo` : null;
  const demoNavLinks = [
    { label: "Home", href: "/" },
    { label: "Planes", href: "#precios" },
    ...(demoHref ? [{ label: "Abrir demo", href: demoHref }] : []),
  ];

  const checkoutParam = typeof searchParams?.checkout === "string" ? searchParams.checkout : undefined;
  const showCheckoutSuccess = checkoutParam === "success";

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header navLinks={demoNavLinks} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {showCheckoutSuccess && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">Gracias. Todo listo.</div>
            <div className="mt-1 text-emerald-800">
              Stripe ha confirmado el pago. En breve recibirás un email de confirmación.
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-100">
              Demo guiada
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-200">
                2 min
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Pruébalo sin miedo. Todo ya está listo.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Entra, toca botones, abre Isaak y mira el panel. Es una demo segura para entender cómo funciona,
              con datos de ejemplo y sin riesgo.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {demoHref ? (
                <a
                  href={demoHref}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Abrir en pantalla completa
                </a>
              ) : (
                <div
                  className="inline-flex items-center justify-center rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
                  aria-disabled="true"
                >
                  Vista previa no disponible
                </div>
              )}
              <a
                href="#precios"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Ver planes
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Volver a Home
              </Link>
            </div>

            <ul className="grid gap-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                Abre Isaak y verás sugerencias contextuales según la sección.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                Facturas y documentos usan datos de prueba; nada es real ni sensible.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                Si quieres una demo personalizada, deja tu email abajo.
              </li>
            </ul>

            <DemoLeadForm />
          </section>

          <section className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-semibold text-slate-600">Vista previa</p>
                {demoHref ? (
                  <a href={demoHref} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                    Abrir
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">No disponible</span>
                )}
              </div>
              {demoHref ? (
                <iframe
                  title="Demo Verifactu"
                  src={demoHref}
                  className="h-[640px] w-full"
                  allow="clipboard-read; clipboard-write"
                />
              ) : (
                <div className="flex h-[640px] w-full items-center justify-center bg-white px-6 text-center">
                  <div className="max-w-md">
                    <div className="text-sm font-semibold text-slate-900">La vista previa no está disponible ahora.</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Mientras tanto, puedes revisar los planes o pedir una demo personalizada.
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Si no carga aquí, ábrela en pantalla completa.
            </p>
          </section>
        </div>

        <section id="precios" className="mt-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Planes (con prueba gratuita)</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Elige un plan cuando estés listo. Puedes empezar sin compromiso y cambiar más adelante.
                </p>
              </div>
              <a
                href="/"
                className="text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Ver detalles en Home
              </a>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={[
                    "relative rounded-2xl border bg-white p-5",
                    plan.highlight ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200",
                  ].join(" ")}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Más popular</span>
                    </div>
                  )}

                  <div className="text-base font-semibold text-slate-900">{plan.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{plan.users}</div>

                  <div className="mt-4">
                    <PriceDisplay price={plan.priceMonthly} />
                    <div className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      Prueba gratuita 30 días · sin tarjeta · sin compromiso
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="text-xs leading-5 text-slate-600">
                        • {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={plan.checkoutMonthly ?? "#"}
                    className={[
                      "mt-5 block w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-center transition",
                      plan.highlight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {plan.priceMonthly === null ? "Contactar" : plan.priceMonthly === 0 ? "Empezar gratis" : "Empezar prueba gratuita"}
                  </a>

                  <div className="mt-3 text-center text-xs text-slate-500">✓ Acceso permanente a tus datos</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-12 border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-slate-800">Verifactu Business</span>
          <div className="flex flex-wrap gap-3 text-xs">
            <a className="hover:text-blue-700" href="/">Ir a Home</a>
            <a className="hover:text-blue-700" href="/auth/signup">Crear cuenta</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

