import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Book, Check, ChevronDown, ExternalLink, HelpCircle } from 'lucide-react';
import { PROVIDER_HELP } from '../provider-help-data';

export function generateStaticParams() {
  return Object.keys(PROVIDER_HELP).map((provider) => ({ provider }));
}

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const help = PROVIDER_HELP[provider];
  if (!help) return {};
  return {
    title: `Ayuda — ${help.name} | Isaak`,
    description: help.tagline,
  };
}

export default async function ProviderHelpPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const help = PROVIDER_HELP[provider];
  if (!help) notFound();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-[#fafbff] px-5 py-3">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft size={13} />
          Volver a Integraciones
        </Link>
      </div>

      <div className="mx-auto w-full max-w-2xl px-5 py-6 space-y-6">
        {/* Provider header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            {help.logo}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#011c67]">{help.name}</h1>
            <p className="text-[13px] text-slate-500">{help.category}</p>
          </div>
        </div>

        <p className="rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-3 text-[13px] text-[#2361d8]">
          {help.tagline}
        </p>

        {/* Step 1: API key */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2361d8] text-[11px] font-bold text-white">
              1
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900">Cómo obtener tu API key</h2>
          </div>
          <ol className="space-y-3">
            {help.apiKeySteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[13px] text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* Step 2: What Isaak syncs */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2361d8] text-[11px] font-bold text-white">
              2
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900">Qué datos sincroniza Isaak</h2>
          </div>
          <ul className="space-y-2">
            {help.whatIsaakSyncs.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-slate-700">
                <Check size={13} className="shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        {help.faq.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <HelpCircle size={15} className="text-[#2361d8]" />
              <h2 className="text-[15px] font-semibold text-slate-900">Preguntas frecuentes</h2>
            </div>
            <div className="space-y-3">
              {help.faq.map((item, i) => (
                <details key={i} className="group rounded-xl border border-slate-100 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-semibold text-slate-800 marker:hidden">
                    {item.q}
                    <ChevronDown
                      size={14}
                      className="shrink-0 text-slate-400 transition group-open:rotate-180"
                    />
                  </summary>
                  <div className="border-t border-slate-100 px-4 py-3 text-[13px] text-slate-600">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Docs link */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-700">Documentación oficial</p>
              <p className="text-[12px] text-slate-500">
                Guías técnicas y referencia completa de la API de {help.name}
              </p>
            </div>
            <a
              href={help.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#2361d8] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1d55c2]"
            >
              <Book size={12} />
              Ver docs
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* CTA back to connect */}
        <div className="pb-4 text-center">
          <Link
            href="/integrations"
            className="inline-flex items-center gap-2 rounded-xl border border-[#2361d8] px-5 py-2.5 text-[13px] font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/5"
          >
            <ArrowLeft size={13} />
            Volver e introducir mi API key
          </Link>
        </div>
      </div>
    </div>
  );
}
