import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, FileSpreadsheet, FolderKanban, ShieldCheck } from 'lucide-react';

const cards = [
  {
    title: 'Facturas y borradores',
    body: 'Consulta contexto de facturas y prepara borradores antes de actuar en Holded.',
    icon: FileSpreadsheet,
  },
  {
    title: 'CRM y contactos',
    body: 'Revisa contactos y actividad comercial con una capa explicativa mucho más simple.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Proyectos y tareas',
    body: 'Traduce proyectos de Holded a prioridades claras para dirección y seguimiento.',
    icon: FolderKanban,
  },
];

const guardrails = [
  'La API key de Holded se guarda server-side y no se expone al cliente.',
  'Las acciones de escritura deben pasar por confirmación explícita.',
  'Isaak opera sobre el workspace autorizado del usuario, no sobre datos públicos.',
];

export default function ClientIsaakForHoldedPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_44%,#ffffff_100%)] text-slate-900">
      <section className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            client.verifactu.business
          </Link>
          <Link href="https://holded.verifactu.business/" className="text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]">
            Volver a la landing Holded
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold text-[#ff5460] ring-1 ring-[#ff5460]/15">
              Isaak for Holded
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              La integración de Holded vive ya en el nuevo entorno cliente de Verifactu.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Este es el punto de entrada actualizado para la experiencia cliente. Desde aquí podrás conectar Holded,
              trabajar con Isaak y pasar después a la experiencia completa de Verifactu sin depender del dashboard legado.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Entrar al nuevo entorno cliente
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://holded.verifactu.business/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Volver a la landing Holded
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {guardrails.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {cards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <card.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
