import { CheckCircle2, Link2 } from 'lucide-react';
import Link from 'next/link';
import { APP_URL, HOLDed_URL, ISAAK_PUBLIC_URL } from '../../lib/isaak-navigation';
import { isV1Launch } from '../../lib/feature-flags';
import { ConsentStep } from './ConsentStep';

const returnToChatUrl = `${ISAAK_PUBLIC_URL}/chat?source=holded_onboarding_return`;
const holdedAuthUrl = `${HOLDed_URL}/auth/holded?source=isaak_onboarding&next=${encodeURIComponent(returnToChatUrl)}`;

export default function IsaakHoldedOnboardingPage() {
  const v1 = isV1Launch();

  return (
    <main className="min-h-screen py-14 text-slate-900">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-[1.8rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fbff_40%,#ffffff_75%)] p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
            <Link2 className="h-3.5 w-3.5" />
            Conectar Holded
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            {v1 ? 'Conecta Holded en 30 segundos' : 'Conecta Holded sin salir del flujo de Isaak'}
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {v1
              ? 'Es el único paso para activar Isaak. Tras autorizar, vuelves al chat con tus datos de Holded ya disponibles.'
              : 'Este paso mantiene el recorrido dentro del entorno de Isaak. Conectarás Holded y podrás volver directamente al chat para continuar con contexto real.'}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Cómo funciona
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Pulsa en conectar y autoriza el acceso desde Holded.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Volverás al chat de Isaak automáticamente, con tus datos disponibles.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Puedes desconectar cuando quieras desde Ajustes &rsaquo; Integración Holded.
                </span>
              </li>
            </ul>
          </div>

          {/* L2: Consentimiento explícito antes de conectar Holded */}
          <ConsentStep holdedAuthUrl={holdedAuthUrl} />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver al chat de Isaak
            </Link>
            {!v1 && (
              <a
                href={APP_URL}
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] bg-white px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ir a la app completa
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
