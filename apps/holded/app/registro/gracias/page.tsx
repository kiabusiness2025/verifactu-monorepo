import { CheckCircle2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildAuthUrl, buildOnboardingUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Gracias | Isaak para Holded',
  description: 'Revisa tu correo, confirma tu acceso y termina la activacion de Holded.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedRegistrationThanksPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const email = readValue(resolved.email);
  const step = readValue(resolved.step) || 'check-email';
  const source = readValue(resolved.source) || 'holded_signup';
  const notice = readValue(resolved.notice);
  const verified = step === 'verified';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-[#ff5460]/15 bg-white shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
          <section className="border-b border-slate-100 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] px-6 py-8 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {verified ? 'Correo confirmado' : 'Registro creado'}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {verified ? 'Tu acceso ya esta activado' : 'Revisa tu correo para continuar'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              {verified
                ? 'Ya puedes entrar y seguir con la conexion de Holded y tu dashboard.'
                : 'Te hemos enviado un correo de confirmacion y otro de bienvenida para que puedas retomar la conexion de Holded sin perderte.'}
            </p>
            {email ? (
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Correo asociado: <span className="text-[#ff5460]">{email}</span>
              </p>
            ) : null}
            {notice === 'verification-email-may-be-delayed' ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Hemos creado tu cuenta. Si el correo tarda en llegar, revisa spam o promociones y
                vuelve a intentarlo en unos minutos.
              </div>
            ) : null}
          </section>

          <section className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail className="h-4 w-4 text-[#ff5460]" />
                Que hacer ahora
              </div>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                <li className="rounded-2xl border border-slate-200 bg-white p-4">
                  1. Abre el correo de verificacion y pulsa en confirmar.
                </li>
                <li className="rounded-2xl border border-slate-200 bg-white p-4">
                  2. Vuelve a Holded e inicia sesion con el mismo email.
                </li>
                <li className="rounded-2xl border border-slate-200 bg-white p-4">
                  3. Pega tu API key de Holded y entra al dashboard.
                </li>
              </ol>
            </article>

            <article className="rounded-3xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-[#ff5460]" />
                Tu siguiente paso
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Todo el flujo se queda dentro de holded.verifactu.business: registro, confirmacion,
                acceso y dashboard.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={buildAuthUrl(source, buildOnboardingUrl(source))}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  {verified ? 'Entrar y continuar' : 'Ir al acceso'}
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Necesito ayuda
                </Link>
              </div>
              <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Si no ves el correo
                </div>
                <p className="mt-2">
                  Revisa spam o promociones. Si sigue sin llegar, escribenos y te ayudamos a
                  reactivar el acceso.
                </p>
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
