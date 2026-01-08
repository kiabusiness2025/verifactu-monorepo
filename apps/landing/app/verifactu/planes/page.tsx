import Link from "next/link";
import PricingCalculator from "../../components/PricingCalculator";

const title = "Planes y precios | Verifactu Business";
const description =
  "Precio que se ajusta a tu uso real: empresas activas, facturas emitidas y movimientos conciliados.";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/verifactu/planes",
    type: "article",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function PlanesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "VeriFactu", href: "/verifactu/que-es" },
            { label: "Planes" },
          ]}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Planes</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Planes y precios</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
          Sin permanencias, sin comisiones sobre facturacion. Pagas segun uso real: empresas activas, facturas y
          movimientos bancarios conciliados. 1 mes gratis y aviso antes de renovar.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Calcula tu precio</h2>
          <p className="mt-2 text-sm text-slate-600">
            Ajusta los controles para ver una cuota orientativa. El IVA no esta incluido.
          </p>
          <div className="mt-4">
            <PricingCalculator />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            La cuota final se basa en empresas activas, facturas emitidas y movimientos procesados (si activas
            conciliacion bancaria). Avisamos antes de renovar para que ajustes el plan.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <PlanFeature title="Cumplimiento VeriFactu" desc="Sellado, hash y trazabilidad automatica de facturas." />
          <PlanFeature title="Soporte humano" desc="Onboarding asistido y respuesta prioritaria en horario laboral." />
          <PlanFeature title="Sin % de facturacion" desc="No tomamos comision sobre tus ventas." />
          <PlanFeature title="Datos siempre tuyos" desc="Exporta facturas, evidencias y movimientos cuando quieras." />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Tienes dudas? Podemos guiarte antes de activar la prueba.</div>
          <div className="flex gap-3">
            <Link
              href="mailto:soporte@verifactu.business"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Hablar con ventas
            </Link>
            <Link
              href="/verifactu/soporte"
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-200"
            >
              Abrir soporte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function PlanFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

type Crumb = { label: string; href?: string };

function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="hover:text-blue-700">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-700">{item.label}</span>
            )}
            {index < items.length - 1 ? <span>/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
