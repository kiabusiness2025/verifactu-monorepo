import Link from "next/link";

export const metadata = {
  title: "Contacto | Verifactu Business",
  description: "Contacta con el equipo de Verifactu Business para soporte, ventas o colaboraciones.",
};

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Recursos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Contacto</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          Escribenos para soporte, ventas o colaboraciones. Te respondemos en horario laboral.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ContactCard
            title="Soporte"
            desc="Incidencias, facturas y dudas operativas."
            action={{ label: "soporte@verifactu.business", href: "mailto:soporte@verifactu.business" }}
          />
          <ContactCard
            title="Ventas"
            desc="Planes a medida y onboarding personalizado."
            action={{ label: "hola@verifactu.business", href: "mailto:hola@verifactu.business" }}
          />
          <ContactCard
            title="Colaboraciones"
            desc="Partners, asesorias y acuerdos con terceros."
            action={{ label: "alianzas@verifactu.business", href: "mailto:alianzas@verifactu.business" }}
          />
          <ContactCard
            title="Estado del servicio"
            desc="Consulta incidencias activas antes de abrir un ticket."
            action={{ label: "Ver estado", href: "/verifactu/estado" }}
          />
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Prefieres que te llamemos?</h2>
          <p className="mt-2 text-sm text-slate-700">
            Deja un contacto y el motivo. Te responderemos con propuestas claras.
          </p>
          <form className="mt-4 grid gap-3">
            <input
              type="text"
              placeholder="Nombre completo"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="email"
              placeholder="Email de contacto"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <textarea
              placeholder="Cuentanos brevemente lo que necesitas"
              className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Enviar solicitud
            </button>
          </form>
          <div className="mt-2 text-xs text-slate-500">Formulario demo, aun sin envio real.</div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-100">
            SLA: respuesta en horario laboral
          </span>
          <Link
            href="/verifactu/soporte"
            className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-100"
          >
            Abrir soporte
          </Link>
        </div>
      </div>
    </main>
  );
}

function ContactCard({
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
        <span aria-hidden>-></span>
      </Link>
    </div>
  );
}
