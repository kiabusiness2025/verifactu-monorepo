import { BadgeCheck, FileText, Scale } from 'lucide-react';

export default function IsaakTermsPage() {
  return (
    <main className="min-h-screen px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8]">
          <FileText className="h-4 w-4" />
          Terms of service
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#011c67]">
          Condiciones de servicio de Isaak
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Isaak es una capa de ayuda fiscal y operativa. Su función es explicar, ordenar y sugerir
          siguientes pasos con mejor contexto.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Alcance
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Isaak ayuda a entender mejor el negocio y sus prioridades, pero no sustituye revisión
              profesional acreditada cuando sea necesaria.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#2361d8]" />
              Responsabilidad del usuario
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El usuario decide qué fuentes conecta, qué datos comparte y qué acciones confirma.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-[#2361d8]" />
              Evolución del producto
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Funciones, límites y compatibilidades pueden cambiar a medida que Isaak se convierte
              en producto independiente.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
