import { Database, Lock, ShieldCheck } from 'lucide-react';

export default function IsaakPrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8]">
          <ShieldCheck className="h-4 w-4" />
          Privacy policy
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#011c67]">
          Política de privacidad de Isaak
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Isaak se apoya en contexto autorizado por usuario y tenant para ayudarte mejor. El
          objetivo es mejorar claridad y continuidad sin perder control ni trazabilidad.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-[#2361d8]" />
              Qué datos se usan
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Datos de cuenta, contexto de conversaciones, señales de negocio y fuentes conectadas
              que el usuario haya autorizado expresamente.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              Principio rector
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Isaak debe ayudarte mejor sin exponer datos sensibles, sin perder control y sin crear
              opacidad innecesaria sobre qué información se usa y para qué.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
