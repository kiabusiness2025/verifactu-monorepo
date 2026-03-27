import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink, KeyRound, LifeBuoy } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ayuda API de Holded | Isaak para Holded',
  description: 'Guia paso a paso para crear una API key en Holded y conectarla con Isaak.',
};

const screenshots = [
  {
    title: 'Paso 1. Entra en Holded y abre Configuracion',
    src: '/help/Configurar%20HOLDED_ISAAK_API_KEY/Paso%201.png',
    alt: 'Pantalla de Holded con acceso al area de configuracion.',
  },
  {
    title: 'Paso 2. Abre Desarrolladores y crea una nueva API key',
    src: '/help/Configurar%20HOLDED_ISAAK_API_KEY/Paso%202.png',
    alt: 'Pantalla de Holded con el area de desarrolladores y creacion de API key.',
  },
];

export default function HoldedApiHelpPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_40%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
                Ayuda
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Como crear tu API key de Holded
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Sigue estos pasos y vuelve despues a pegar la clave en Isaak. Solo necesitas una API
                key activa y creada desde tu propia cuenta de Holded.
              </p>
            </div>
            <Link
              href="/onboarding/holded"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a conectar
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <a
              href="https://app.holded.com/login"
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-[#ff5460]/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ExternalLink className="h-4 w-4 text-[#ff5460]" />
                Paso 1. Entra en Holded
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Accede con tu usuario habitual de Holded. Si usas varias cuentas, entra en la
                empresa correcta antes de seguir.
              </p>
            </a>
            <a
              href="https://app.holded.com/home#settings:/"
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-[#ff5460]/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ExternalLink className="h-4 w-4 text-[#ff5460]" />
                Paso 2. Ve a Configuracion
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Dentro de Holded abre Configuracion, luego Mas y despues Desarrolladores.
              </p>
            </a>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-[#ff5460]" />
              Pasos siguientes
            </div>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
              <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="font-semibold text-slate-900">3.</span> Pulsa{' '}
                <span className="font-semibold text-slate-900">+ Nueva API Key</span>.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="font-semibold text-slate-900">4.</span> Usa como nombre{' '}
                <span className="font-mono text-slate-900">ISAAK_HOLDED_API_KEY</span>.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="font-semibold text-slate-900">5.</span> Copia la clave generada,
                vuelve a Isaak y pegala en el campo de conexion.
              </li>
            </ol>
          </div>

          <div className="mt-8 space-y-6">
            {screenshots.map((shot) => (
              <section
                key={shot.src}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-950">{shot.title}</h2>
                </div>
                <div className="bg-slate-50 p-4">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={1600}
                    height={1000}
                    className="h-auto w-full rounded-2xl border border-slate-200 bg-white"
                  />
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <div className="flex items-center gap-2 font-semibold">
              <LifeBuoy className="h-4 w-4" />
              Si no ves Desarrolladores
            </div>
            <p className="mt-2">
              Normalmente significa que tu usuario de Holded no tiene permisos suficientes o que has
              entrado en otra empresa. Prueba con el administrador principal o pide acceso a esa
              seccion.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
