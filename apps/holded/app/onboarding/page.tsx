import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, FolderKanban, ReceiptText } from 'lucide-react';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  buildAuthUrl,
  buildConnectorConnectUrl,
  buildConnectorIntroUrl,
} from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Onboarding | Isaak para Holded',
  description:
    'Resumen del alcance del conector de Holded antes de activar la conexion con tu empresa.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function readChannel(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] || '' : value || '';
  return resolved === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export default async function HoldedOnboardingPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_onboarding';
  const channel = readChannel(resolved.channel);
  const next = readSource(resolved.next);
  const onboardingToken = readSource(resolved.onboarding_token);
  const session = await getHoldedSession();

  const introUrl = buildConnectorIntroUrl({
    source,
    channel,
    next,
    onboardingToken,
  });
  const connectUrl = buildConnectorConnectUrl({
    source,
    channel,
    next,
    onboardingToken,
  });

  if (!session?.tenantId) {
    redirect(buildAuthUrl(source, introUrl));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white px-6 py-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
            Paso 1 de 2
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Esto es lo que activas al conectar Holded
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Antes de pegar la API key te dejamos claro el alcance del conector. En el siguiente paso
            solo te pediremos los datos minimos de empresa y contacto, junto con la API key de
            Holded.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <ReceiptText className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">Ventas y facturas</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Podras consultar facturas emitidas, abrir sus PDF y preparar borradores de factura
                desde Isaak.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Building2 className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">Compras y gastos</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tambien podras revisar facturas de gasto y compras, abrir sus PDF y obtener
                resumenes compactos para trabajar desde el chat.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <FolderKanban className="h-5 w-5 text-[#ff5460]" />
              <div className="mt-4 text-sm font-semibold text-slate-900">Contexto contable</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                La conexion incluye contactos, cuentas contables, diario, proyectos y el contexto
                necesario para que Isaak responda con datos reales.
              </p>
            </article>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            La conexion no te pedira configuraciones intermedias. En el siguiente paso solo
            recogeremos la identidad basica de empresa y contacto para crear bien tu espacio,
            enviarte avisos de conexion o desconexion y dejar el panel listo desde el primer uso.
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={connectUrl}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
            >
              Continuar a la conexion
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
