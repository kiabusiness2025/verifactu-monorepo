'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCENE_NAMES = [
  'scene-1-pyg',
  'scene-2-clientes',
  'scene-3-facturas',
  'scene-4-dashboard',
  'scene-5-borrador',
  'scene-6-comparativa',
] as const;

const FALLBACK_MS = 30_000;

interface Props {
  className?: string;
}

export function DualConnectorHero({ className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [loadedL, setLoadedL] = useState(false);
  const [loadedR, setLoadedR] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    timerRef.current = null;
    setLoadedL(false);
    setLoadedR(false);
    setIndex((i) => (i + 1) % SCENE_NAMES.length);
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.holded === 'sceneDone') {
        // Guard: only schedule advance once (both iframes signal done)
        if (!timerRef.current) {
          timerRef.current = setTimeout(advance, 800);
        }
      }
    };
    window.addEventListener('message', handler);
    fallbackRef.current = setTimeout(advance, FALLBACK_MS);

    return () => {
      window.removeEventListener('message', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [advance, index]);

  const scene = SCENE_NAMES[index];
  const srcClaude = `/demo/${scene}.html?connector=claude&once=1&mode=full`;
  const srcChatGPT = `/demo/${scene}.html?connector=chatgpt&once=1&mode=full`;

  return (
    <div
      className={`overflow-hidden rounded-2xl lg:rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.48)] ${className}`}
    >
      {/* Header labels */}
      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold text-slate-700">Claude · MCP</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-slate-700">ChatGPT · Plugin</span>
        </div>
      </div>

      {/* Dual scaled iframes */}
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        {/* Claude panel */}
        <div className="relative overflow-hidden" style={{ height: 360 }}>
          <iframe
            key={`claude-${scene}`}
            src={srcClaude}
            onLoad={() => setLoadedL(true)}
            title="Demo Holded · Claude"
            allow="autoplay"
            style={{
              width: '200%',
              height: 720,
              border: 'none',
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
            }}
            className={`transition-opacity duration-500 ${loadedL ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        {/* ChatGPT panel */}
        <div className="relative overflow-hidden" style={{ height: 360 }}>
          <iframe
            key={`chatgpt-${scene}`}
            src={srcChatGPT}
            onLoad={() => setLoadedR(true)}
            title="Demo Holded · ChatGPT"
            allow="autoplay"
            style={{
              width: '200%',
              height: 720,
              border: 'none',
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
            }}
            className={`transition-opacity duration-500 ${loadedR ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      </div>

      {/* Scene progress dots */}
      <div className="flex justify-center gap-1.5 border-t border-slate-100 py-3">
        {SCENE_NAMES.map((_, i) => (
          <button
            type="button"
            key={i}
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              if (fallbackRef.current) clearTimeout(fallbackRef.current);
              timerRef.current = null;
              setLoadedL(false);
              setLoadedR(false);
              setIndex(i);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-5 bg-amber-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Escena ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
