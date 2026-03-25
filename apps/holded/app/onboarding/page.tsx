import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, KeyRound, MailCheck } from 'lucide-react';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const metadata: Metadata = {
  title: 'Onboarding | Isaak para Holded',
  description: 'Onboarding gratuito de Holded: acceso, API key y entrada al dashboard.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedOnboardingPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_onboarding';
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(`/onboarding?source=${source}`)}`
    );
  }

  const connection = await getHoldedConnection(session.tenantId);
  if (connection) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white px-6 py-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
            Onboarding gratuito
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Vamos a dejar tu Holded listo en menos de un minuto
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Ya tienes acceso. Ahora solo falta validar tu API key y llevarte al dashboard para tu
            primer chat con Isaak.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <MailCheck className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">1. Acceso listo</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tu cuenta ya esta preparada para continuar dentro de Holded.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <KeyRound className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">2. Pega tu API key</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                La pegas una vez y la comprobamos al instante.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <CheckCircle2 className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">3. Entra al dashboard</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Llegas directo al chat y ya puedes empezar a preguntar.
              </p>
            </article>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding/holded"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
            >
              Continuar con mi API key
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Necesito ayuda
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
