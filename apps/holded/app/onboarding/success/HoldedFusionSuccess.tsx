'use client';

import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const PROFILE_ONBOARDING_URL = `${HOLDED_SITE_URL}/onboarding/profile?source=holded_connection_complete&fresh=1`;

export default function HoldedFusionSuccess() {
  const [showFusion, setShowFusion] = useState(false);
  const [showContextCard, setShowContextCard] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const REDIRECT_MS = 5500;

  useEffect(() => {
    const fusionTimer = window.setTimeout(() => setShowFusion(true), 900);
    const contextTimer = window.setTimeout(() => setShowContextCard(true), 1250);
    const readyTimer = window.setTimeout(() => setShowReady(true), 1900);
    const redirectTimer = window.setTimeout(() => {
      window.location.assign(PROFILE_ONBOARDING_URL);
    }, REDIRECT_MS);

    const TICK = 80;
    let elapsed = 0;
    const progressInterval = window.setInterval(() => {
      elapsed += TICK;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.min(100, Math.round((elapsed / REDIRECT_MS) * 100))}%`;
      }
    }, TICK);

    return () => {
      window.clearTimeout(fusionTimer);
      window.clearTimeout(contextTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(redirectTimer);
      window.clearInterval(progressInterval);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-white px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,#fff4f5_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-10 shadow-[0_35px_120px_-58px_rgba(255,84,96,0.45)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,84,96,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,84,96,0.16),rgba(255,255,255,0)_70%)] blur-2xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 animate-bounce" />
              Conexion completada
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              ¡Holded conectado!
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Ya puedes preguntarle a ChatGPT sobre tus facturas, contactos y datos de Holded.
            </p>

            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Prueba a preguntar
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  '¿Cuánto he facturado este mes?',
                  'Lista mis facturas pendientes de cobro',
                  '¿Quiénes son mis clientes principales?',
                  '¿Cuál es mi resultado operativo?',
                  'Crea una factura para [cliente] por [importe]',
                ].map((q) => (
                  <li key={q} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff5460]" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mt-12 h-[21rem] sm:h-[24rem]">
              <div className="holded-fusion-rail absolute left-1/2 top-[6.2rem] hidden h-1 w-[18rem] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.22),rgba(255,84,96,0.28))] sm:block" />

              <div
                className={`holded-fusion-chip holded-fusion-chip-left absolute left-1/2 top-0 flex h-28 w-28 -translate-x-[9.75rem] items-center justify-center rounded-[2rem] border border-emerald-200 bg-white shadow-[0_18px_50px_-35px_rgba(16,185,129,0.55)] transition-all duration-300 sm:h-32 sm:w-32 sm:-translate-x-[13rem] ${
                  showFusion ? 'scale-75 opacity-0' : 'opacity-100'
                }`}
              >
                <Image
                  src="/brand/ChatGPT%20logo.png"
                  alt="ChatGPT"
                  width={56}
                  height={56}
                  className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                  priority
                />
              </div>
              <div
                className={`absolute left-1/2 top-[7.8rem] -translate-x-[9.75rem] text-sm font-semibold text-slate-600 transition-all duration-300 sm:-translate-x-[13rem] ${
                  showFusion ? 'opacity-0' : 'opacity-100'
                }`}
              >
                ChatGPT
              </div>

              <div
                className={`holded-fusion-chip holded-fusion-chip-right absolute left-1/2 top-0 flex h-28 w-28 translate-x-[2.75rem] items-center justify-center rounded-[2rem] border border-[#ff5460]/15 bg-white shadow-[0_18px_50px_-35px_rgba(255,84,96,0.45)] transition-all duration-300 sm:h-32 sm:w-32 sm:translate-x-[8.8rem] ${
                  showFusion ? 'scale-75 opacity-0' : 'opacity-100'
                }`}
              >
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={52}
                  height={52}
                  className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                  priority
                />
              </div>
              <div
                className={`absolute left-1/2 top-[7.8rem] translate-x-[2.75rem] text-sm font-semibold text-slate-600 transition-all duration-300 sm:translate-x-[8.8rem] ${
                  showFusion ? 'opacity-0' : 'opacity-100'
                }`}
              >
                Holded
              </div>

              <div
                className={`absolute left-1/2 top-[4.4rem] h-28 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,84,96,0.48),rgba(255,84,96,0.18)_45%,rgba(255,255,255,0)_72%)] blur-md transition-all duration-500 sm:h-36 sm:w-36 ${
                  showFusion ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />
              <div
                className={`absolute left-1/2 top-[5.1rem] h-10 w-10 -translate-x-1/2 rounded-full bg-white shadow-[0_0_60px_rgba(255,84,96,0.55)] transition-all duration-500 ${
                  showFusion ? 'holded-fusion-burst scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />

              <div
                className={`absolute left-1/2 top-[5.2rem] w-full max-w-[20rem] -translate-x-1/2 transition-all duration-700 ${
                  showContextCard ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
              >
                <div className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#fff4f5] ring-8 ring-white">
                    <Image
                      src="/assistant/holded-avatar.png"
                      alt="Guia de configuracion Holded"
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>
                  <div className="mt-4 text-xl font-bold text-slate-950">Contexto inicial</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Preparando tus datos de empresa, prioridades y primer acceso con la conexion ya
                    validada.
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`transition-all duration-500 ${
                showReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              }`}
            >
              <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
                <div className="h-1 w-full bg-slate-100">
                  <div
                    ref={progressBarRef}
                    className="h-1 w-0 rounded-full bg-[#ff5460] transition-[width] duration-75 ease-linear"
                  />
                </div>
                <p className="px-5 py-3.5 text-sm leading-6 text-slate-600">
                  En unos segundos te llevamos a completar la configuracion inicial. Pulsa el boton
                  de ChatGPT si prefieres empezar a usar el conector ahora.
                </p>
              </div>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="https://chatgpt.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Volver a ChatGPT
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="https://app.verifactu.business"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver dashboard
                </a>
                <Link
                  href={PROFILE_ONBOARDING_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Completar configuracion
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
