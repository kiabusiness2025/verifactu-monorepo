'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const DASHBOARD_URL = '/dashboard?source=holded_connection_complete';

export default function HoldedFusionSuccess() {
  const [showIsaak, setShowIsaak] = useState(false);
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    const isaakTimer = window.setTimeout(() => setShowIsaak(true), 1000);
    const readyTimer = window.setTimeout(() => setShowReady(true), 1800);
    const redirectTimer = window.setTimeout(() => {
      window.location.assign(DASHBOARD_URL);
    }, 3200);

    return () => {
      window.clearTimeout(isaakTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(redirectTimer);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-white px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,#fff4f5_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-10 shadow-[0_35px_120px_-58px_rgba(255,84,96,0.45)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,84,96,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,84,96,0.16),rgba(255,255,255,0)_70%)] blur-2xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              <Sparkles className="h-3.5 w-3.5" />
              Conexion completada
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Holded y Isaak ya estan hablando entre si
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Hemos unido tu espacio de Holded con el chat de Isaak. En unos segundos entraras al
              dashboard para empezar con tu primera pregunta.
            </p>

            <div className="relative mt-12 h-[21rem] sm:h-[24rem]">
              <div className="holded-fusion-rail absolute left-1/2 top-[6.2rem] hidden h-1 w-[18rem] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.22),rgba(255,84,96,0.28))] sm:block" />

              <div className="holded-fusion-chip holded-fusion-chip-left absolute left-1/2 top-0 flex h-28 w-28 -translate-x-[9.75rem] items-center justify-center rounded-[2rem] border border-emerald-200 bg-white shadow-[0_18px_50px_-35px_rgba(16,185,129,0.55)] sm:h-32 sm:w-32 sm:-translate-x-[13rem]">
                <Image
                  src="/brand/ChatGPT%20logo.png"
                  alt="ChatGPT"
                  width={56}
                  height={56}
                  className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                  priority
                />
              </div>
              <div className="absolute left-1/2 top-[7.8rem] -translate-x-[9.75rem] text-sm font-semibold text-slate-600 sm:-translate-x-[13rem]">
                ChatGPT
              </div>

              <div className="holded-fusion-chip holded-fusion-chip-right absolute left-1/2 top-0 flex h-28 w-28 translate-x-[2.75rem] items-center justify-center rounded-[2rem] border border-[#ff5460]/15 bg-white shadow-[0_18px_50px_-35px_rgba(255,84,96,0.45)] sm:h-32 sm:w-32 sm:translate-x-[8.8rem]">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={52}
                  height={52}
                  className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                  priority
                />
              </div>
              <div className="absolute left-1/2 top-[7.8rem] translate-x-[2.75rem] text-sm font-semibold text-slate-600 sm:translate-x-[8.8rem]">
                Holded
              </div>

              <div
                className={`holded-fusion-isaak absolute left-1/2 top-[5.2rem] w-full max-w-[20rem] -translate-x-1/2 transition-all duration-700 ${
                  showIsaak ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
              >
                <div className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#fff4f5] ring-8 ring-white">
                    <Image
                      src="/Isaak/isaak-avatar.png"
                      alt="Isaak"
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>
                  <div className="mt-4 text-xl font-bold text-slate-950">Isaak</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Preparando tu chat inicial, tus preguntas sugeridas y la lectura de tu espacio
                    de Holded.
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`transition-all duration-500 ${
                showReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              }`}
            >
              <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm backdrop-blur">
                Si prefieres no esperar, puedes entrar ya. Si no haces nada, te llevamos
                automaticamente al dashboard.
              </div>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={DASHBOARD_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Entrar al dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/onboarding/holded"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Revisar conexion
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
