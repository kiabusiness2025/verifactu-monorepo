import { ExternalLink, VideoIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Demo OpenAI Review | Conector Holded para ChatGPT — Verifactu Business',
  description:
    'Grabación real del conector Holded para ChatGPT: flujo OAuth, consulta de datos y confirmación de borradores. Desarrollado por Expert Estudios Profesionales, SLU (Verifactu Business).',
};

// ── Sustituye por la URL de YouTube cuando esté publicado el vídeo ────────────
const YOUTUBE_URL = '';
// Ejemplo: 'https://www.youtube.com/embed/XXXXXXXXXXX'

function VideoEmbed() {
  if (YOUTUBE_URL) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200">
        <iframe
          src={YOUTUBE_URL}
          title="Demo Conector Holded para ChatGPT"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
      <video
        controls
        poster="/brand/holded/holded-diamond-logo.png"
        className="h-full w-full"
        preload="metadata"
      >
        <source src="/video/holded-chatgpt-demo.mp4" type="video/mp4" />
        Tu navegador no soporta la reproducción de vídeo.
      </video>
    </div>
  );
}

export default function OpenAIReviewDemoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* ── Badge + título ── */}
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-200">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                fill
                sizes="40px"
                className="object-contain p-1"
              />
            </div>
            <span className="text-[22px] font-bold text-slate-900">+</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10a37f] text-white">
              <VideoIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#10a37f]/20 bg-[#10a37f]/8 px-4 py-1.5 text-xs font-semibold text-[#10a37f]">
            <VideoIcon className="h-3.5 w-3.5" />
            Demo para revisión OpenAI Platform
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Conector Holded para ChatGPT — Grabación real
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Este vídeo muestra el flujo real del conector: autenticación OAuth, consulta de datos de
            Holded en lenguaje natural desde ChatGPT, y confirmación explícita antes de cualquier
            acción de escritura.
          </p>
        </div>

        {/* ── Vídeo ── */}
        <div className="mt-8">
          <VideoEmbed />
          <p className="mt-3 text-center text-xs text-slate-400">
            Desarrollado por{' '}
            <a
              href="https://verifactu.business"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Expert Estudios Profesionales, SLU · Verifactu Business
            </a>{' '}
            · Holded Solution Partner
          </p>
        </div>

        {/* ── Qué muestra el vídeo ── */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Flujos mostrados en la demo</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {[
              'Conexión del conector desde ChatGPT — flujo OAuth completo con Holded.',
              'Consulta de facturas pendientes de cobro en lenguaje natural.',
              'Resumen de contactos y estado de clientes activos.',
              'Creación de borrador de factura con confirmación explícita del usuario antes de ejecutar.',
              'Consulta de proyectos activos y horas registradas.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-[#10a37f]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Datos técnicos ── */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Protocolo', 'MCP (Model Context Protocol)'],
            ['Autenticación', 'OAuth 2.0 con Holded'],
            ['Operaciones escritura', 'Solo con confirmación explícita'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Links ── */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/conectores/chatgpt"
            className="inline-flex items-center gap-2 rounded-full bg-[#10a37f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d9270]"
          >
            Ver página del conector
          </Link>
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Política de privacidad
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Términos de servicio
          </Link>
          <a
            href="mailto:soporte@verifactu.business"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            soporte@verifactu.business
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </main>
  );
}
