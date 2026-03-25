import { BadgeCheck, FileText, Mail, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terminos y condiciones | Isaak para Holded',
  description: 'Terminos y condiciones de uso de holded.verifactu.business.',
};

export default function HoldedTermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <FileText className="h-4 w-4" />
              Terminos y condiciones
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Terminos de uso de Isaak para Holded
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Estos terminos regulan el acceso y uso de holded.verifactu.business en su version
              gratuita inicial.
            </p>
            <p className="text-sm text-slate-500">Ultima actualizacion: 25 de marzo de 2026.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Aviso importante
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Isaak ofrece ayuda operativa e informacion de apoyo. No sustituye a un asesor fiscal,
              contable o legal.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-[#ff5460]" />
              Alcance del servicio
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La version gratuita permite crear acceso, verificar el correo, conectar Holded
              mediante API key, entrar al dashboard y usar el chat inicial de Isaak.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              Responsabilidad del usuario
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El usuario es responsable de la cuenta de Holded que conecta, de la API key que
              facilita y de revisar cualquier accion sensible antes de confirmarla.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              Disponibilidad y cambios
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El servicio se ofrece en evolucion. Las funciones disponibles, limites y pantallas
              pueden cambiar a medida que el producto madure o cambien los requisitos tecnicos de
              terceros.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-[#ff5460]" />
              Contacto
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Para dudas legales o del servicio, escribe a{' '}
              <a
                href="mailto:info@verifactu.business"
                className="font-semibold text-[#ff5460] underline underline-offset-4"
              >
                info@verifactu.business
              </a>{' '}
              o usa{' '}
              <Link
                href="/support"
                className="font-semibold text-[#ff5460] underline underline-offset-4"
              >
                soporte Holded
              </Link>
              .
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
