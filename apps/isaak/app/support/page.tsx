import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LifeBuoy, Mail, MessageCircleMore, ShieldCheck, Sparkles } from 'lucide-react';
import { SUPPORT_EMAIL } from '../lib/isaak-navigation';

export default function IsaakSupportPage() {
  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=Soporte%20Isaak`;

  return (
    <main className="min-h-screen px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8]">
          <LifeBuoy className="h-4 w-4" />
          Soporte oficial
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#011c67]">Soporte de Isaak</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Si necesitas ayuda con la activación, el contexto de tu cuenta o el uso diario de Isaak,
          este es el punto de soporte de referencia.
        </p>

        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_100%)] p-5">
              <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                <Image
                  src="/Personalidad/isaak-avatar-verifactu.png"
                  alt="Avatar de Isaak"
                  fill
                  sizes="176px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2361d8]">
                <Sparkles className="h-3.5 w-3.5" />
                Ayuda inmediata
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#011c67]">
                Si tu duda se puede explicar en una frase, empieza por el chat de Isaak.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Para incidencias simples, criterio fiscal inicial o dudas de activación, el camino
                más rápido suele ser hablar primero con Isaak y luego escalar a soporte si hace
                falta más contexto.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
                >
                  <MessageCircleMore className="h-4 w-4" />
                  Hablar con Isaak
                </Link>
                <a
                  href={supportHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Escribir a soporte
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-[#2361d8]" />
              Contacto directo
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Escríbenos a{' '}
              <a
                href={supportHref}
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Qué incluir en tu mensaje
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Indica el email con el que entras, qué estabas intentando hacer y, si existe, el error
              visible. Así reducimos tiempo de ida y vuelta.
            </p>
          </article>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Enlaces útiles
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Política de privacidad
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Términos y condiciones
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-4 py-2 font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Chat abierto
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
