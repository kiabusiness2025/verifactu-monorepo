import { ArrowRight, Play, VideoIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Demo recording | Holded Connector',
  description:
    'Demo recording for the Holded connector. The current OpenAI review demo shows invoices, contacts, accounting accounts, daily ledger and draft invoice confirmation.',
  alternates: { canonical: '/demo-recording' },
};

const CURRENT_DEMO = {
  title: 'OpenAI review demo - Holded para ChatGPT',
  description:
    'Grabacion real del conector Holded para ChatGPT con alcance cerrado: facturas, contactos, cuentas contables, diario con rango de fechas y borrador de factura con confirmacion explicita.',
  href: '/conectores/chatgpt/openai-review-demo',
  videoSrc: '/video/holded-chatgpt-demo.mp4',
};

const FUTURE_DEMOS = [
  'Claude connector demo',
  'Mobile review walkthrough',
  'Invoice draft confirmation flow',
];

export default function DemoRecordingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <VideoIcon className="h-3.5 w-3.5" />
                Demo recordings
              </div>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
              Biblioteca de demos del conector Holded
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Esta URL se mantiene estable para formularios y revisiones externas. La demo principal
              actual es la grabacion de revision OpenAI del conector Holded para ChatGPT.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={CURRENT_DEMO.href}
                className="inline-flex items-center gap-2 rounded-full bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d8f6f]"
              >
                Abrir pagina de demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/conectores/chatgpt"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Ver conector ChatGPT
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 lg:w-[20rem]">
            <p className="text-sm font-semibold text-slate-900">URL estable</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Mantener `/demo-recording` evita romper enlaces ya enviados. Las nuevas demos pueden
              anadirse aqui como biblioteca sin cambiar la URL historica.
            </p>
          </div>
        </div>

        <section className="mt-12 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="aspect-video overflow-hidden rounded-t-lg bg-slate-950">
            <video controls playsInline preload="metadata" className="h-full w-full">
              <source src={CURRENT_DEMO.videoSrc} type="video/mp4" />
              Tu navegador no soporta la reproduccion de video.
            </video>
          </div>
          <div className="p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Play className="h-3.5 w-3.5" />
              Demo actual
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
              {CURRENT_DEMO.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {CURRENT_DEMO.description}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Proximas demos</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            La pagina queda preparada para alojar varias demos sin cambiar la URL ya compartida.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {FUTURE_DEMOS.map((title) => (
              <article
                key={title}
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5"
              >
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Pendiente de publicacion.</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
