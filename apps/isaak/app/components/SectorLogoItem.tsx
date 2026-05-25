'use client';

import { useState } from 'react';

type FallbackStage = 'favicon' | 'initial';

interface Props {
  name: string;
  sector: string;
  domain: string;
  href: string;
  color: string;
  initial: string;
  connected: boolean;
}

export default function SectorLogoItem({
  name,
  sector,
  domain,
  href,
  color,
  initial,
  connected,
}: Props) {
  const [stage, setStage] = useState<FallbackStage>('favicon');

  const imgSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`${name} — ${sector}`}
      className="group flex flex-col items-center gap-2"
    >
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border transition group-hover:shadow-md ${
          connected ? 'border-[#2361d8]/30 shadow-sm shadow-blue-100' : 'border-slate-200 bg-white'
        }`}
      >
        {stage === 'initial' ? (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={name}
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            onError={() => setStage('initial')}
          />
        )}
        {connected && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white">
            ✓
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-slate-700 transition group-hover:text-[#2361d8]">
        {name}
      </span>
      <span className="text-[10px] text-slate-400">{sector}</span>
    </a>
  );
}
