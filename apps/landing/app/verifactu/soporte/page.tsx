import Link from "next/link";

const title = "Soporte | Verifactu Business";
const description = "Abre ticket, agenda onboarding o consulta el centro de ayuda de Verifactu Business.";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/verifactu/soporte",
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

export default function SoportePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "VeriFactu", href: "/verifactu/que-es" },
            { label: "Soporte" },
          ]}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Soporte</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Estamos para ayudarte</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          Elige cómo prefieres recibir ayuda: ticket rápido, onboarding guiado o consultar guías paso a paso.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SupportCard
            title="Ticket rápido"
            desc="Cuéntanos el problema y adjunta capturas. Respondemos en horario laboral."
            action={{ label: "Abrir ticket", href: "mailto:soporte@verifactu.business" }}
          />
          <SupportCard
            title="Onboarding guiado"
            desc="Configura VeriFactu, bancos y permisos con un especialista."
            action={{ label: "Agendar sesión", href: "mailto:soporte@verifactu.business?subject=Onboarding" }}
          />
          <SupportCard
            title="Centro de ayuda"
            desc="Preguntas frecuentes sobre facturación, VeriFactu y conciliación."
            action={{ label: "Ver guías", href: "/recursos/guias-y-webinars" }}
          />
          <SupportCard
            title="Estado del servicio"
            desc="Comprueba si hay incidencias en VeriFactu, AEAT o bancos."
            action={{ label: "Ver estado", href: "/verifactu/estado" }}
          />
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Consejos para soporte rápido</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>- Adjunta capturas o números de factura afectados.</li>
            <li>- Indica si el fallo es en app.verifactu.business o en la sincronización con bancos/AEAT.</li>
            <li>- Dinos si has probado refrescar sesión o reconectar la integración.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-100">
            SLA: respuesta en horario laboral
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-100">
            Prioridad para incidencias VeriFactu
          </span>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">¿Quieres calcular tu precio y activar la prueba?</div>
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
              Abrir soporte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function SupportCard({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
      <Link
        href={action.href}
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        {action.label}
        <span aria-hidden>{'->'}</span>
      </Link>
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



