import Link from "next/link";

const title = "Estado del servicio | Verifactu Business";
const description = "Estado operativo de VeriFactu, AEAT y bancos conectados.";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/verifactu/estado",
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

type Status = { name: string; state: "operativo" | "incidencia" | "mantenimiento"; note?: string };

const statusList: Status[] = [
  { name: "Verifactu Business", state: "operativo", note: "Sin incidencias" },
  { name: "AEAT VeriFactu", state: "operativo", note: "Validaciones OK" },
  { name: "Conexion bancaria", state: "operativo", note: "Sin retrasos reportados" },
];

export default function EstadoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "VeriFactu", href: "/verifactu/que-es" },
            { label: "Estado del servicio" },
          ]}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Estado</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Estado del servicio</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          Aqui veras si hay incidencias en VeriFactu, AEAT o en las integraciones bancarias. Si algo falla, publicaremos
          actualizaciones y tiempos estimados.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {statusList.map((item) => (
            <StatusRow key={item.name} {...item} />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ves algo raro?</h2>
          <p className="mt-2 text-sm text-slate-700">
            Enviamos detalles (capturas, hora aproximada, factura afectada). Prioridad para incidencias VeriFactu/AEAT.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href="mailto:soporte@verifactu.business?subject=Incidencia%20servicio"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Reportar incidencia
            </a>
            <Link
              href="/verifactu/soporte"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-100"
            >
              Abrir ticket
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Respuesta en horario laboral. Si hay incidente critico, lo publicaremos aqui.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Quieres ver planes o activar la prueba?</div>
          <div className="flex gap-3">
            <Link
              href="/verifactu/planes"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Ver planes
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

function StatusRow({ name, state, note }: Status) {
  const color =
    state === "operativo"
      ? "bg-emerald-500"
      : state === "mantenimiento"
      ? "bg-amber-500"
      : "bg-red-500";
  const label =
    state === "operativo" ? "Operativo" : state === "mantenimiento" ? "Mantenimiento" : "Incidencia";

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{name}</div>
        <div className="text-xs text-slate-600">{note || "Sin notas adicionales"}</div>
      </div>
      <div className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
        <span className="text-xs font-semibold text-slate-800">{label}</span>
      </div>
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
