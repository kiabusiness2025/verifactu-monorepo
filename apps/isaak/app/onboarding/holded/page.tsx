import { ArrowRight, CheckCircle2, Link2 } from 'lucide-react';
import Link from 'next/link';
import { APP_URL, HOLDed_URL, ISAAK_PUBLIC_URL } from '../../lib/isaak-navigation';

const returnToChatUrl = `${ISAAK_PUBLIC_URL}/chat?source=holded_onboarding_return`;
const holdedAuthUrl = `${HOLDed_URL}/auth/holded?source=isaak_onboarding&next=${encodeURIComponent(returnToChatUrl)}`;

export default function IsaakHoldedOnboardingPage() {
  return (
    <main className="min-h-screen py-14 text-slate-900">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-[1.8rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fbff_40%,#ffffff_75%)] p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
            <Link2 className="h-3.5 w-3.5" />
            Onboarding Holded desde Isaak
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            Conecta Holded sin salir del flujo de Isaak
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Este paso mantiene el recorrido dentro del entorno de Isaak. Conectaras Holded y podras
            volver directamente al chat para continuar con contexto real.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Como funciona
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Pulsa en conectar y completa el acceso de Holded.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Al finalizar, te devolvemos al chat de Isaak para seguir sin perder contexto.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Si prefieres activar todo el entorno completo, tambien puedes abrir la app.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={holdedAuthUrl}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
            >
              Conectar Holded ahora
              <ArrowRight className="h-4 w-4" />
            </a>

            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver al chat de Isaak
            </Link>

            <a
              href={APP_URL}
              className="inline-flex items-center justify-center rounded-full border border-[#2361d8] bg-white px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Ir a la app completa
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
