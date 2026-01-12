import Link from "next/link";

const title = "GuÃ­as y webinars | Verifactu Business";
const description = "Recursos prÃ¡cticos para cumplir VeriFactu, automatizar facturaciÃ³n y sacar partido a Isaak.";

export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/recursos/guias-y-webinars",
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

const guides = [
  {
    title: "GuÃ­a rÃ¡pida VeriFactu 2025",
    desc: "Checklist tÃ©cnica y operativa para activar VeriFactu sin fricciones.",
    cta: "Descargar PDF",
  },
  {
    title: "Webinar: de cero a facturar con Isaak",
    desc: "CÃ³mo emitir, registrar gastos y validar con AEAT en 30 minutos.",
    cta: "Ver grabaciÃ³n",
  },
  {
    title: "AutomatizaciÃ³n bancaria",
    desc: "Conecta bancos y reconcilia movimientos con reglas simples.",
    cta: "Ver guÃ­a",
  },
];

export default function GuiasWebinarsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Recursos", href: "/recursos/guias-y-webinars" },
            { label: "GuÃ­as y webinars" },
          ]}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#0060F0]">Recursos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">GuÃ­as y webinars</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          Material listo para usar: activa VeriFactu, optimiza tus facturas y evita errores tÃ­picos.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {guides.map((item) => (
            <ResourceCard key={item.title} {...item} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Â¿Quieres un webinar privado?</h2>
          <p className="mt-2 text-sm text-slate-700">
            Preparamos sesiones enfocadas a tu equipo: facturaciÃ³n, bancos o auditorÃ­a interna.
          </p>
          <Link
            href="mailto:soporte@verifactu.business?subject=Webinar%20privado"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
          >
            Solicitar sesiÃ³n
            <span aria-hidden>{'->'}</span>
          </Link>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Â¿Quieres activar la prueba y ver el precio final?</div>
          <div className="flex gap-3">
            <Link
              href="/demo#calculadora"
              className="rounded-full bg-[#0060F0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0056D6]"
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

function ResourceCard({ title, desc, cta }: { title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
      <button className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]">
        {cta} <span aria-hidden>{'->'}</span>
      </button>
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
              <Link href={item.href} className="hover:text-[#0060F0]">
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



