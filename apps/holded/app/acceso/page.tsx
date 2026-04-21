import { Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from '../components/ContactForm';
import { buildAuthUrl } from '../lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Acceso anticipado | Holded',
  description:
    'El conector de Holded para ChatGPT está en proceso de aprobación en OpenAI. Deja tu contacto y te avisamos en cuanto el acceso público esté disponible.',
};

export default function AccesoPage() {
  return (
    <main className="min-h-screen py-14 text-slate-900">
      <div className="mx-auto max-w-2xl px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          <Clock3 className="h-3.5 w-3.5" />
          Acceso anticipado
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.6rem]">
          El GPT de Holded está en proceso de aprobación en OpenAI.
        </h1>

        <p className="mt-5 text-base leading-8 text-slate-600">
          El conector funciona y está operativo. Mientras OpenAI completa la aprobación para
          distribución pública, el acceso es limitado. Deja tu nombre y correo y te avisamos en
          cuanto esté disponible para todos.
        </p>

        <div className="mt-6 space-y-3">
          {[
            'Consulta facturas, IVA, gastos, clientes, productos y documentos desde Holded.',
            'Respuestas en lenguaje claro, sin tecnicismos ni necesidad de entender el ERP.',
            'Acceso gratuito para usuarios de ChatGPT cuando esté disponible.',
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-6 text-slate-700"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.45)] sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            Avísame cuando esté disponible
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Deja tu correo y te contactamos en cuanto el acceso público esté listo.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            No realiza cambios en tu cuenta de Holded. Solo puede generar borradores de facturas
            emitidas, y siempre con tu confirmación explícita.
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-center sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            ← Volver a la landing
          </Link>
          <span className="hidden text-slate-300 sm:block">·</span>
          <Link
            href={buildAuthUrl('acceso_page_existing')}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Ya tengo acceso
          </Link>
        </div>
      </div>
    </main>
  );
}
