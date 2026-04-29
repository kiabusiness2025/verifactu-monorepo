import {
  ArrowLeft,
  BookOpen,
  FileText,
  LifeBuoy,
  Mail,
  MessageSquareText,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getHoldedSession } from '@/app/lib/holded-session';
import { SoporteForm } from './SoporteForm';

export const metadata: Metadata = {
  title: 'Soporte | Conector Holded para ChatGPT — Verifactu Business',
  description:
    'Centro de soporte del conector Holded para ChatGPT. Envía un formulario, escríbenos por email o habla con Isaak. Disponible para todos los usuarios.',
  alternates: { canonical: '/conectores/chatgpt/soporte' },
};

const LEGAL_LINKS = [
  { label: 'Documentación', href: '/conectores/chatgpt/docs', Icon: BookOpen },
  { label: 'Privacidad', href: '/conectores/chatgpt/privacy', Icon: ShieldCheck },
  { label: 'DPA', href: '/conectores/chatgpt/dpa', Icon: FileText },
  { label: 'Términos', href: '/conectores/chatgpt/terms', Icon: Scale },
];

const SUPPORT_EMAIL = 'soporte@verifactu.business';
const CHAT_SUPPORT_URL =
  '/support/chat?source=chatgpt_connector&prompt=Necesito+ayuda+con+el+conector+Holded+para+ChatGPT';

export default async function ChatGPTSoportePage() {
  const session = await getHoldedSession();
  const isRegistered = !!session?.userId;

  return (
    <main className="min-h-screen bg-[linear-gradient(175deg,#ffffff_0%,#f0fdf4_100%)] text-slate-900">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-10 border-b border-emerald-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/conectores/chatgpt"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al conector ChatGPT
          </Link>
          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hidden text-xs font-medium text-slate-500 transition hover:text-emerald-700 sm:inline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-12">
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-slate-300">+</span>
              <Image
                src="/brand/chatgpt-logo.png"
                alt="ChatGPT"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <LifeBuoy className="h-4 w-4" />
              Soporte / Ayuda
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Centro de soporte
              <span className="block text-2xl font-semibold text-emerald-700">
                Conector Holded para ChatGPT
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Elige cómo prefieres contactar con nuestro equipo. Respondemos en horario laboral (L–V
              9–18h). Para incidencias urgentes del conector, adjunta una captura del error.
            </p>
          </div>

          {/* Quick contact card */}
          <div className="shrink-0 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm lg:w-[22rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-emerald-600" />
              Contacto directo
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Para incidencias urgentes o que el chatbot no resuelve:
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Soporte%20Conector%20ChatGPT%20%2B%20Holded`}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
            {isRegistered && (
              <p className="mt-3 text-xs text-slate-500">
                Sesión activa — puedes adjuntar imágenes en el formulario de abajo.
              </p>
            )}
          </div>
        </div>

        {/* ── 3 Support options ── */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {/* Option 1: Form */}
          <div className="md:col-span-2 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-emerald-600" />
              Formulario de contacto
              {isRegistered && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Adjuntos activados
                </span>
              )}
            </div>
            <p className="mb-5 text-xs leading-5 text-slate-500">
              Describe tu consulta. Si eres usuario registrado, puedes adjuntar capturas de pantalla
              o PDFs para que el equipo pueda revisar el problema con más contexto.
            </p>
            <SoporteForm isRegistered={isRegistered} />
          </div>

          {/* Option 2: Email + Option 3: Chat */}
          <div className="flex flex-col gap-4">
            {/* Email */}
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail className="h-4 w-4 text-emerald-600" />
                Email directo
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Escríbenos con tu duda, error o solicitud. Incluye capturas si puedes.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Soporte%20Conector%20ChatGPT%20%2B%20Holded`}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Mail className="h-3.5 w-3.5" />
                Abrir email
              </a>
            </article>

            {/* Chat */}
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquareText className="h-4 w-4 text-emerald-600" />
                Chat con Isaak
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Isaak puede guiarte en tiempo real: diagnóstico, documentación y pasos para resolver
                los errores más comunes del conector.
              </p>
              <a
                href={CHAT_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2361d8]/25 bg-[#2361d8]/5 px-3 py-2 text-xs font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                Abrir chat
              </a>
            </article>

            {/* Quick links */}
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold text-slate-500">Recursos útiles</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/conectores/chatgpt/docs"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  → Documentación del conector
                </Link>
                <Link
                  href="/conectores/chatgpt/privacy"
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  → Política de privacidad
                </Link>
                <Link
                  href="/conectores/chatgpt/terms"
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  → Términos de servicio
                </Link>
              </div>
            </article>
          </div>
        </div>

        {/* ── Footer legal nav ── */}
        <footer className="mt-12 border-t border-slate-100 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/conectores/chatgpt"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Conector ChatGPT
            </Link>
            <div className="flex flex-wrap gap-6">
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-slate-500 transition hover:text-emerald-700"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <p className="w-full text-center text-xs text-slate-400 sm:w-auto sm:text-right">
              Expert Estudios Profesionales, SLU · Verifactu Business · Holded Solution Partner
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
