import { ExternalLink, LifeBuoy, MessageSquareText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Soporte | Isaak con Holded como compatibilidad',
  description:
    'Canales de soporte de Isaak para usuarios que conectan Holded como fuente compatible dentro de verifactu.business.',
};

const supportOptions = [
  {
    title: 'Soporte por email',
    body: 'Escríbenos para incidencias de conexión, errores de tools o dudas sobre la activación de tu cuenta.',
    actionLabel: 'info@verifactu.business',
    actionHref: 'mailto:info@verifactu.business?subject=Soporte%20Isaak%20for%20Holded',
  },
  {
    title: 'Ayuda de onboarding',
    body: 'Te ayudamos a localizar tu API key de Holded, validar permisos y completar la primera conexión.',
    actionLabel: 'Solicitar ayuda',
    actionHref: 'mailto:info@verifactu.business?subject=Ayuda%20onboarding%20Holded',
  },
  {
    title: 'Experiencia completa',
    body: 'Si quieres panel visual, trazabilidad y reglas fiscales, te guiamos para activar verifactu.business.',
    actionLabel: 'Ver Verifactu',
    actionHref: 'https://verifactu.business',
  },
];

export default function HoldedSupportPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/holded"
            className="text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]"
          >
            Volver a Isaak con Holded
          </Link>
          <Link
            href="https://verifactu.business"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            verifactu.business
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <LifeBuoy className="h-4 w-4" />
              Soporte oficial
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Soporte de Isaak con Holded como fuente compatible
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Si estás conectando Holded y necesitas ayuda, este es el punto de soporte oficial de
              Isaak. Atendemos dudas de onboarding, errores de conexión y preguntas sobre la
              experiencia completa de verifactu.business.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
              Para ayudarte más rápido, incluye en tu mensaje:
              <ul className="mt-3 space-y-1">
                <li>- el email con el que has iniciado sesión en Isaak o Verifactu</li>
                <li>- una captura del error visible</li>
                <li>- si el fallo ocurre en ChatGPT, onboarding o dashboard</li>
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
              Horario de soporte
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Respondemos en horario laboral. Si la incidencia afecta a onboarding o a la conexión
              de Holded, priorizamos la revisión para que Isaak pueda empezar a trabajar cuanto
              antes.
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

        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquareText className="h-4 w-4 text-[#ff5460]" />
            Contacto directo
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Email de soporte:{' '}
            <a
              href="mailto:info@verifactu.business"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              info@verifactu.business
            </a>
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            También puedes ampliar a la experiencia completa en{' '}
            <Link
              href="https://verifactu.business"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              verifactu.business
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
