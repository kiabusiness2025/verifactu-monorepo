// Componente reutilizable: badge "Holded Solution Partner".
//
// Variantes:
//   - 'inline' (default): chip pequeño, ideal para hero o trust-signal row
//   - 'card':    bloque más grande con descripción, para sección dedicada
//   - 'minimal': solo logo + texto, sin caja (footer/legal)
//
// HOLDED_PARTNER_URL apunta a la ficha oficial de Expert Estudios
// Profesionales, SLU en el directorio de Solution Partners de Holded.

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

export const HOLDED_PARTNER_URL = 'https://www.holded.com/es/directorio-solution-partners/expert';
export const HOLDED_HOME_URL = 'https://www.holded.com/es';

type Variant = 'inline' | 'card' | 'minimal';

export default function HoldedPartnerBadge({
  variant = 'inline',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  if (variant === 'minimal') {
    return (
      <a
        href={HOLDED_PARTNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 text-xs text-slate-500 transition hover:text-slate-800 ${className}`}
      >
        <Image
          src="/brand/holded/holded-logo.svg"
          alt="Holded"
          width={14}
          height={14}
          className="h-3.5 w-3.5"
        />
        <span>
          <strong className="font-semibold">Holded</strong> Solution Partner
        </span>
      </a>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left ${className}`}
      >
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50">
          <Image
            src="/brand/holded/holded-logo.svg"
            alt="Holded"
            width={40}
            height={40}
            className="h-10 w-10"
          />
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200">
            Partner oficial
          </div>
          <h3 className="mt-1.5 text-base font-bold text-[#011c67]">
            Verifactu Business es Holded Solution Partner
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Como partner oficial de{' '}
            <a
              href={HOLDED_HOME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#2361d8] hover:underline"
            >
              Holded
            </a>
            , gestionamos altas, configuración inicial y soporte de la
            integración con Isaak para que tu ERP funcione desde el día uno.
          </p>
          <a
            href={HOLDED_PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2361d8] hover:underline"
          >
            Ver ficha en el catálogo de partners
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  // inline
  return (
    <a
      href={HOLDED_PARTNER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 ${className}`}
      title="Verifactu Business es Holded Solution Partner"
    >
      <Image
        src="/brand/holded/holded-logo.svg"
        alt="Holded"
        width={14}
        height={14}
        className="h-3.5 w-3.5"
      />
      <span>
        <strong className="font-bold">Holded</strong> Solution Partner
      </span>
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  );
}
