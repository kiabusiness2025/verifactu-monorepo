import { CheckCircle2, MailCheck, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildAuthUrl, buildOnboardingUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Verifica tu acceso | Isaak para Holded',
  description:
    'Confirma tu correo y continúa el onboarding gratuito de Holded dentro del mismo producto.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedVerifyPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readValue(resolved.source) || 'holded_verify';
  const email = readValue(resolved.email);
  const verified = readValue(resolved.step) === 'verified';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white p-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
            {verified ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <MailCheck className="h-3.5 w-3.5" />
            )}
            {verified ? 'Correo confirmado' : 'Verificación pendiente'}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {verified ? 'Tu correo ya está verificado' : 'Te estamos esperando en tu correo'}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {verified
              ? 'Perfecto. Ya puedes iniciar sesión y pasar directamente al onboarding de Holded.'
              : 'Revisa tu bandeja de entrada y confirma el enlace. Sin ese paso no podremos activar tu acceso gratuito.'}
          </p>
          {email ? (
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Correo: <span className="text-[#ff5460]">{email}</span>
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={buildAuthUrl(source, buildOnboardingUrl(source))}
              className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
            >
              {verified ? 'Entrar y continuar' : 'Ir al acceso'}
            </Link>
            <Link
              href="/gracias"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver pasos del onboarding
            </Link>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Qué pasa después
            </div>
            <p className="mt-2">
              Tras iniciar sesión te pediremos solo una cosa: tu API key de Holded. La validamos al
              momento y, si todo encaja, te llevamos al dashboard.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
