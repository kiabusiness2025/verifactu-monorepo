import { ExternalLink, LifeBuoy, Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import SupportAssistantClient from '../components/SupportAssistantClient';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';
const supportMailto = `mailto:${supportEmail}?subject=Ayuda%20con%20mi%20acceso%20a%20Holded`;

export const metadata: Metadata = {
  title: 'Soporte | Isaak para Holded',
  description: 'Ayuda rapida para acceso, verificacion, onboarding y conexion con Holded.',
};

const supportOptions = [
  {
    title: 'Escribir a soporte',
    body: 'Si ves un error al crear tu acceso, verificar el correo o entrar al dashboard, escribenos y te ayudamos.',
    actionLabel: 'Enviar email',
    actionHref: supportMailto,
  },
  {
    title: 'Volver al onboarding',
    body: 'Si ya tienes acceso y solo te falta la API key, vuelve al paso de conexion de Holded.',
    actionLabel: 'Ir al onboarding',
    actionHref: '/onboarding/holded',
  },
  {
    title: 'Volver al acceso',
    body: 'Si todavia no has terminado el alta, vuelve al acceso y continua con tu mismo correo.',
    actionLabel: 'Ir al acceso',
    actionHref: '/auth/holded?source=holded_support',
  },
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedSupportPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readValue(resolved.source);
  const digest = readValue(resolved.digest);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <LifeBuoy className="h-4 w-4" />
              Ayuda rapida
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Te ayudamos a terminar el alta
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Si te atascas al crear tu acceso, verificar el correo, conectar Holded o entrar al
              dashboard, este es el punto de ayuda.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
              Para ayudarte mas rapido, incluye en tu mensaje:
              <ul className="mt-3 space-y-1">
                <li>- el email con el que has creado tu acceso</li>
                <li>- una captura del error visible</li>
                <li>- si el fallo ocurre en acceso, verificacion, onboarding o dashboard</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[25rem]">
            <div className="mb-5 flex justify-center rounded-3xl bg-[linear-gradient(180deg,#fff7f7_0%,#f8fbff_100%)] p-4">
              <Image
                src="/Isaak/isaak-avatar-holded.png"
                alt="Isaak"
                width={220}
                height={220}
                className="h-auto w-full max-w-[8rem]"
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Soporte en horario laboral
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Si el problema bloquea tu conexion con Holded o el acceso al dashboard, priorizamos la
              revision para que puedas completar el alta cuanto antes.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {supportOptions.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              <a
                href={item.actionHref}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]"
              >
                {item.actionLabel}
                <ExternalLink className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>

        <div id="contacto" className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-[#ff5460]" />
              Contacto directo
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{supportEmail}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquareText className="h-4 w-4 text-[#ff5460]" />
              Consejo practico
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Si ya tienes sesion iniciada, entra primero al onboarding o al dashboard. Asi podremos
              ubicar tu tenant y revisar el caso con mas contexto.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <SupportAssistantClient
            source={source || 'holded_support'}
            digest={digest || undefined}
            title="Soy Isaak y puedo ayudarte a salir del bloqueo sin iniciar sesion."
          />
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]">
            Volver a la landing
          </Link>
        </div>
      </section>
    </main>
  );
}
