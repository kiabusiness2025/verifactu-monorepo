import Link from "next/link";

const title = "Blog | Verifactu Business";
const description = "Consejos practicos para facturacion, cumplimiento y operaciones con VeriFactu.";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/recursos/blog",
    type: "article",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

const posts = [
  {
    title: "Errores mas comunes al emitir facturas VeriFactu",
    desc: "Cinco fallos que vemos a diario y como evitarlos.",
    date: "Mar 10, 2026",
  },
  {
    title: "Como preparar tu empresa para una auditoria express",
    desc: "Checklist de evidencias y procesos que Isaak te ayuda a mantener.",
    date: "Feb 21, 2026",
  },
  {
    title: "Conciliacion bancaria sin dolores de cabeza",
    desc: "Automatiza movimientos y detecta gastos duplicados.",
    date: "Feb 03, 2026",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Recursos", href: "/recursos/guias-y-webinars" },
            { label: "Blog" },
          ]}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Recursos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          Ideas y practicas para una facturacion clara, ordenada y lista para VeriFactu.
        </p>

        <div className="mt-8 space-y-4">
          {posts.map((post) => (
            <article key={post.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{post.date}</div>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{post.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{post.desc}</p>
              <button className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
                Leer articulo
                <span aria-hidden>-></span>
              </button>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quieres recibir las novedades?</h2>
          <p className="mt-2 text-sm text-slate-700">
            Enviaremos tips cortos sobre cumplimiento, cambios de AEAT y productividad.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="tu@email.com"
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Suscribirme
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">No enviamos spam. Puedes darte de baja cuando quieras.</div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Quieres ver planes claros y empezar hoy?</div>
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
