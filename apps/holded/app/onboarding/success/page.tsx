import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, MessageCircleMore, Sparkles } from 'lucide-react';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';

export const metadata: Metadata = {
  title: 'Conexión lista | Isaak para Holded',
  description:
    'Conexión validada correctamente. Ya puedes entrar al dashboard y empezar tu primer chat.',
};

export default async function HoldedOnboardingSuccessPage() {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect('/auth/holded?source=holded_onboarding_success&next=/onboarding');
  }

  const connection = await getHoldedConnection(session.tenantId);
  if (!connection) {
    redirect('/onboarding/holded');
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white p-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Conexión lista
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Holded ya está conectado
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            La API key funciona y ya hemos preparado tu acceso al dashboard gratuito.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Sparkles className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">Lo siguiente</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Entrar al dashboard y lanzar tu primera pregunta a Isaak con la conexión ya activa.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <MessageCircleMore className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">Primer chat</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El dashboard ya te sugerirá preguntas sobre ventas, clientes, cobros y gastos.
              </p>
            </article>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
            >
              Ir al dashboard
            </Link>
            <Link
              href="/onboarding/holded"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Revisar conexión
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
