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
  connector: 'claude' | 'chatgpt';
  className?: string;
}

export function SingleSceneHero({ connector, className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    timerRef.current = null;
    setLoaded(false);
    setIndex((i) => (i + 1) % SCENE_NAMES.length);
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.holded === 'sceneDone' && !timerRef.current) {
        timerRef.current = setTimeout(advance, 800);
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
  const src = `/demo/${scene}.html?connector=${connector}&once=1&mode=full`;
  const dotActive = connector === 'claude' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className={`overflow-hidden rounded-2xl lg:rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.48)] ${className}`}
    >
      <iframe
        key={src}
        src={src}
        onLoad={() => setLoaded(true)}
        title={`Demo Holded · ${connector}`}
        allow="autoplay"
        className={`block w-full border-none transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ height: 520 }}
      />

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
              setLoaded(false);
              setIndex(i);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? `w-5 ${dotActive}` : 'w-1.5 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Escena ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
