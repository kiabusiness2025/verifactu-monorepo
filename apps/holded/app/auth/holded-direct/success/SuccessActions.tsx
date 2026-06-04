'use client';

/**
 * Tarjeta de plataforma (Claude / ChatGPT) en la página /auth/holded-direct/success.
 *
 * Muestra:
 *   - Icono + título + subtítulo
 *   - 3 pasos numerados
 *   - URL del conector con botón copy-to-clipboard
 *   - CTA que abre las settings de la plataforma en una pestaña nueva
 *
 * Es client component porque necesita navigator.clipboard y useState para el
 * feedback "Copiado ✓".
 */

import { Check, Copy, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type Platform = 'claude' | 'chatgpt';

interface SuccessActionsProps {
  platform: Platform;
  mcpUrl: string;
  settingsUrl: string;
  title: string;
  subtitle: string;
  steps: string[];
}

const PLATFORM_THEME: Record<
  Platform,
  { ring: string; bg: string; cta: string; label: string; logoSrc: string; logoAlt: string }
> = {
  claude: {
    ring: 'ring-orange-200',
    bg: 'bg-orange-50',
    cta: 'bg-[#d97757] hover:bg-[#c4654a]',
    label: 'Abrir Claude',
    logoSrc: '/brand/claude-logo.svg',
    logoAlt: 'Claude',
  },
  chatgpt: {
    ring: 'ring-emerald-200',
    bg: 'bg-emerald-50',
    cta: 'bg-[#10a37f] hover:bg-[#0e8a6c]',
    label: 'Abrir ChatGPT',
    logoSrc: '/brand/chatgpt-logo.png',
    logoAlt: 'ChatGPT',
  },
};

export function SuccessActions({
  platform,
  mcpUrl,
  settingsUrl,
  title,
  subtitle,
  steps,
}: SuccessActionsProps) {
  const [copied, setCopied] = useState(false);
  const theme = PLATFORM_THEME[platform];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: seleccionar el input para que el usuario pulse Ctrl+C
      const input = document.getElementById(`mcp-url-${platform}`) as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.bg} ring-1 ${theme.ring}`}
        >
          <Image
            src={theme.logoSrc}
            alt={theme.logoAlt}
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Steps */}
      <ol className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {/* URL + copy */}
      <div className="mt-4">
        <label
          htmlFor={`mcp-url-${platform}`}
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500"
        >
          URL del conector
        </label>
        <div className="flex gap-2">
          <input
            id={`mcp-url-${platform}`}
            type="text"
            readOnly
            value={mcpUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="block h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-[11px] text-slate-700 focus:border-slate-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            aria-label="Copiar URL del conector"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </>
            )}
          </button>
        </div>
      </div>

      {/* CTA */}
      <a
        href={settingsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition ${theme.cta}`}
      >
        {theme.label}
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
