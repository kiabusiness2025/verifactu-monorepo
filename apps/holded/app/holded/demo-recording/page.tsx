import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Demo del Conector Holded — Grabacion',
  description:
    'Grabacion oficial de la demo del Conector Holded para ChatGPT. Ve como consultar facturas, contactos, contabilidad y proyectos directamente desde el chat.',
};

const VIDEO_URL = '/video/Video%20Holded%20App%201.mp4';

export default function HoldedDemoRecordingPage() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10 sm:py-16">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Image
              src="/brand/holded/holded-diamond-logo.png"
              alt="Holded"
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Conector Holded para ChatGPT</div>
            <div className="text-xs text-slate-400">holded.verifactu.business</div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff5460]/30 bg-[#ff5460]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff7a84]">
            Grabacion oficial · Demo
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Conector Holded en accion
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
            Consulta facturas, contactos, contabilidad y proyectos de Holded directamente desde
            ChatGPT. Respuestas en lenguaje claro, sin menus.
          </p>
        </div>

        {/* Video */}
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <video
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
            poster="/brand/holded/holded-diamond-logo.png"
          >
            <source src={VIDEO_URL} type="video/mp4" />
            Tu navegador no soporta la reproduccion de video.
          </video>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-slate-400">
            Gratis para usuarios de ChatGPT · Conexion en menos de 1 minuto
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
          >
            Conectar Holded ahora
          </Link>
        </div>
      </div>
    </main>
  );
}
