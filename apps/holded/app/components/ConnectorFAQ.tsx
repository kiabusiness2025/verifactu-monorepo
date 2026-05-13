/**
 * ConnectorFAQ — bloque de preguntas frecuentes visible al usuario y a la vez
 * expuesto en JSON-LD FAQPage (via getFaqJsonLd) para SEO/AEO en Google,
 * ChatGPT, Perplexity y Gemini.
 *
 * Las 10 preguntas estan calibradas con las objeciones reales detectadas en
 * la audiencia objetivo (asesorias y autonomos espanoles que usan Holded):
 *  - privacidad / Anthropic
 *  - planes de Holded compatibles
 *  - relacion con VeriFactu/AEAT
 *  - perfil tecnico necesario
 *  - alcance del beta
 *  - costes futuros
 *  - desconexion / portabilidad
 *  - multi-cuenta
 *  - idiomas
 *  - soporte
 */
'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { buildFaqs } from '@/app/components/ConnectorFAQData';

type ConnectorId = 'claude' | 'chatgpt';

type Theme = {
  accentText: string;
  accentBg: string;
  pill: string;
};

const THEMES: Record<ConnectorId, Theme> = {
  claude: {
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-50',
    pill: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  chatgpt: {
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
};

export function ConnectorFAQ({
  connector,
  aiName,
  provider,
}: {
  connector: ConnectorId;
  aiName: string;
  provider: string;
}) {
  const theme = THEMES[connector];
  const faqs = buildFaqs(aiName, provider);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="border-y border-slate-100 bg-slate-50/50 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <div
            className={`mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.pill}`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Preguntas frecuentes
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Lo que más nos preguntan antes de conectar.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Privacidad, planes de Holded, VeriFactu, costes y soporte. Si te falta algo, abre la
            página de soporte del conector o escríbenos a soporte@verifactu.business.
          </p>
        </div>

        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {faqs.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold leading-6 text-slate-900">{f.q}</span>
                  <ChevronDown
                    className={`mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm leading-7 text-slate-600">{f.a}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
