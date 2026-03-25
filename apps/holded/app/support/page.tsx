import { ExternalLink, LifeBuoy, MessageSquareText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Soporte | Isaak para Holded',
  description: 'Canales de soporte para usuarios que estan activando o usando Isaak con Holded.',
};

const supportOptions = [
  {
    title: 'Soporte por email',
    body: 'Escribenos si ves un error al iniciar sesion, validar la API key o entrar al dashboard.',
    actionLabel: 'Escribir a soporte',
    actionHref: 'mailto:info@verifactu.business',
  },
  {
    title: 'Ayuda con tu API key',
    body: 'Te ayudamos a localizar tu API key de Holded y comprobar si tiene acceso valido.',
    actionLabel: 'Volver al onboarding',
    actionHref: '/onboarding/holded',
  },
  {
    title: 'Acceso gratuito',
    body: 'Si aun no has terminado el alta, vuelve al flujo gratuito y continua donde lo dejaste.',
    actionLabel: 'Ir a la landing',
    actionHref: '/',
  },
];

export default function HoldedSupportPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <LifeBuoy className="h-4 w-4" />
              Soporte oficial
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Soporte para el onboarding de Holded
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Si te atascas al crear tu acceso, verificar el correo, conectar Holded o entrar al
              dashboard, este es el punto de ayuda.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
              Para ayudarte mas rapido, incluye en tu mensaje:
              <ul className="mt-3 space-y-1">
                <li>- el email con el que has iniciado sesion</li>
                <li>- una captura del error visible</li>
                <li>- si el fallo ocurre en verificacion, onboarding o dashboard</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[25rem]">
            <div className="mb-5 flex justify-center rounded-3xl bg-[linear-gradient(180deg,#fff7f7_0%,#f8fbff_100%)] p-4">
              <Image
                src="/Isaak/isaak-avatar.png"
                alt="Isaak"
                width={220}
                height={220}
                className="h-auto w-full max-w-[8rem]"
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Respuesta en horario laboral
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Si la incidencia bloquea la conexion con Holded o el acceso al dashboard, priorizamos
              la revision para que puedas completar el alta.
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

        <div id="contacto" className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquareText className="h-4 w-4 text-[#ff5460]" />
            Contacto directo
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Si ya tienes sesion iniciada, entra al onboarding o al dashboard antes de escribirnos.
            Asi podremos ubicar tu tenant y revisar el caso con mas contexto.
          </p>
        </div>
      </section>
    </main>
  );
}
