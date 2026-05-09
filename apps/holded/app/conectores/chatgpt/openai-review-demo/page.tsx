import { ExternalLink, VideoIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Demo OpenAI Review | Conector Holded para ChatGPT - Verifactu Business',
  description:
    'Grabacion real del conector Holded para ChatGPT: conexion segura, consulta de datos y confirmacion de borradores.',
  alternates: { canonical: '/conectores/chatgpt/openai-review-demo' },
};

// Demo video wiring para la review de OpenAI.
//
// Precedencia: YOUTUBE_URL > LOCAL (HAS_LOCAL_VIDEO) > fallback card.
// La URL publica de la pagina (`/conectores/chatgpt/openai-review-demo`) es la
// que se mete en el campo "Demo Recording URL" de OpenAI — nunca cambia.
//
// Para sustituir el video sin tocar la URL publica:
//   - Si subes una nueva version a YouTube: cambia YOUTUBE_URL con el nuevo
//     embed (`https://www.youtube.com/embed/<videoId>`). YouTube tiene prioridad
//     sobre el MP4 local.
//   - Si re-grabas localmente: reemplaza /public/video/holded-chatgpt-demo.mp4
//     manteniendo el mismo nombre de archivo.
const YOUTUBE_URL = 'https://www.youtube.com/embed/Sa0n7xUkSNM';
const LOCAL_VIDEO_URL = '/video/holded-chatgpt-demo.mp4';
const HAS_LOCAL_VIDEO = true; // mp4 ya desplegado en apps/holded/public/video/

function VideoEmbed() {
  if (YOUTUBE_URL) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200">
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

  if (HAS_LOCAL_VIDEO) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
        <video controls playsInline preload="metadata" className="h-full w-full">
          <source src={LOCAL_VIDEO_URL} type="video/mp4" />
          Tu navegador no soporta la reproduccion de video.
        </video>
      </div>
    );
  }

  // Fallback: explanatory card with the test prompts a reviewer can run live.
  // Avoids a broken <video> player while the recording is being produced.
  return (
    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <VideoIcon className="h-4 w-4" />
        Video demo en preparacion
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        Mientras finalizamos la grabacion, los revisores pueden reproducir el flujo en vivo desde
        ChatGPT con el conector ya autorizado, usando los prompts listados abajo. Los pasos
        coinciden con la matriz de revision (POS-01 a POS-07).
      </p>
      <ol className="mt-4 space-y-1.5 text-sm leading-6 text-slate-700">
        <li>1. List my latest 5 Holded invoices.</li>
        <li>2. Show me the details of invoice F0030 from the list.</li>
        <li>3. List my Holded contacts and include Kappa Digital Zaragoza SL if it appears.</li>
        <li>4. Show me the details of Kappa Digital Zaragoza SL from that list.</li>
        <li>5. List my main accounting accounts in Holded.</li>
        <li>
          6. Show my Holded daily ledger entries from <code>2026-03-01</code> to{' '}
          <code>2026-03-31</code>.
        </li>
        <li>
          7. Create a draft invoice for Kappa Digital Zaragoza SL for one service line of 100 EUR
          plus 21% VAT. Ask for confirmation before creating it.
        </li>
        <li>8. Yes, create the draft invoice.</li>
      </ol>
      <p className="mt-4 text-xs leading-6 text-slate-500">
        El borrador se crea con <code>draft: true</code>. No se envia, finaliza, cobra ni elimina
        nada. Los reviewers pueden inspeccionar el draft en Holded UI tras el paso 8.
      </p>
    </div>
  );
}

export default function OpenAIReviewDemoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-16">
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
            Demo para revision OpenAI Platform
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Conector Holded para ChatGPT - Grabacion real
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Este video muestra el flujo real del conector: conexion segura alojada por Verifactu,
            consulta de datos de Holded en lenguaje natural desde ChatGPT y confirmacion explicita
            antes de cualquier accion de escritura.
          </p>
        </div>

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
              Expert Estudios Profesionales, SLU - Verifactu Business
            </a>{' '}
            - Holded Solution Partner
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Flujos mostrados en la demo</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {[
              'Conexion del conector desde ChatGPT mediante flujo seguro alojado por Verifactu.',
              'Consulta de facturas y detalle de una factura existente en lenguaje natural.',
              'Resumen de contactos y detalle de un contacto existente.',
              'Consulta de cuentas contables y diario con rango explicito de fechas.',
              'Creacion de borrador de factura con confirmacion explicita del usuario antes de ejecutar.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-[#10a37f]">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Protocolo', 'MCP / Apps SDK'],
            ['Conexion', 'Credenciales server-side'],
            ['Escritura', 'Solo con confirmacion'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/conectores/chatgpt"
            className="inline-flex items-center gap-2 rounded-full bg-[#10a37f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d9270]"
          >
            Ver pagina del conector
          </Link>
          <Link
            href="/demo-recording"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Biblioteca de demos
          </Link>
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Politica de privacidad
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Terminos de servicio
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
