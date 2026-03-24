import { LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import { SUPPORT_EMAIL } from '../lib/isaak-navigation';

export default function IsaakSupportPage() {
  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=Soporte%20Isaak`;

  return (
    <main className="min-h-screen px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8]">
          <LifeBuoy className="h-4 w-4" />
          Soporte oficial
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#011c67]">Soporte de Isaak</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Si necesitas ayuda con la activación, el contexto de tu cuenta o el uso diario de Isaak,
          este es el punto de soporte de referencia.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-[#2361d8]" />
              Contacto directo
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Escríbenos a{' '}
              <a
                href={supportHref}
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Qué incluir en tu mensaje
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Indica el email con el que entras, qué estabas intentando hacer y, si existe, el error
              visible. Así reducimos tiempo de ida y vuelta.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
