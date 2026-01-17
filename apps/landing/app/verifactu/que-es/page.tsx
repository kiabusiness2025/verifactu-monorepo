import Link from "next/link";

const title = "QuÃ© es VeriFactu | Verifactu Business";
const description =
  "VeriFactu es el sistema de facturaciÃ³n verificable que garantiza trazabilidad, auditorÃ­a y cumplimiento anti-fraude.";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/verifactu/que-es",
    type: "article",
    images: [
      {
        url: "/brand/social/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Verifactu Business",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/brand/social/og-1200x630.png"],
  },
};

export default function QueEsVeriFactuPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "VeriFactu", href: "/verifactu/que-es" },
            { label: "QuÃ© es" },
          ]}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">VeriFactu</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">QuÃ© es VeriFactu</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          VeriFactu es el estÃ¡ndar de facturaciÃ³n verificable exigido por la AEAT para garantizar la integridad de tus
          facturas. Cada asiento queda trazado con hash y marca de tiempo, listo para auditorÃ­a sin esfuerzo.
        </p>

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
          <Feature title="Trazabilidad automÃ¡tica" desc="Cada factura se sella con hash y marca temporal." />
          <Feature title="Integridad anti-manipulaciÃ³n" desc="HistÃ³rico inmutable: sin sobrescrituras ni borrados ocultos." />
          <Feature title="AuditorÃ­a simplificada" desc="Exporta registros y evidencias en un clic." />
          <Feature title="Listo para la AEAT" desc="Cumple con los requisitos tÃ©cnicos y de reporte." />
        </div>

        <div className="mt-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Por quÃ© integrarlo con Isaak</h2>
          <p className="text-sm leading-6 text-slate-700">
            Isaak aplica las reglas de VeriFactu, valida tus envÃ­os y te avisa si algo se desvÃ­a. Combina cumplimiento con
            panel claro de ventas, gastos y beneficio.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Cumplimiento automatizado
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-100">
              Alertas y validaciÃ³n
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
              Exportaciones listas para auditorÃ­a
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Â¿Necesitas que te guiemos? Revisa los planes o contÃ¡ctanos.</div>
          <div className="flex gap-3">
            <Link
              href="/demo#calculadora"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Calcula tu precio
            </Link>
            <Link
              href="/verifactu/soporte"
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-200"
            >
              Hablar con soporte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
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

