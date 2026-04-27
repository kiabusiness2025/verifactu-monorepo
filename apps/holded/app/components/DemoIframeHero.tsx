'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCENES = [
  'scene-1-pyg',
  'scene-2-clientes',
  'scene-3-facturas',
  'scene-4-dashboard',
  'scene-5-borrador',
  'scene-6-comparativa',
] as const;

const SCENE_FALLBACK_MS = 32_000; // max wait before forcing advance

interface Props {
  connector: 'claude' | 'chatgpt';
  className?: string;
}

export function DemoIframeHero({ connector, className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    setLoaded(false);
    setIndex((i) => (i + 1) % SCENES.length);
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.holded === 'sceneDone') {
        timerRef.current = setTimeout(advance, 600);
      }
    };
    window.addEventListener('message', handler);
    fallbackRef.current = setTimeout(advance, SCENE_FALLBACK_MS);

    return () => {
      window.removeEventListener('message', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [advance, index]);

  const src = `/demo/${SCENES[index]}.html?connector=${connector}&once=1`;
  const dotActive = connector === 'claude' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl lg:rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.48)] ${className}`}
    >
      <iframe
        key={src}
        src={src}
        onLoad={() => setLoaded(true)}
        className={`block h-[520px] sm:h-[600px] lg:h-[700px] w-full border-none transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        title={`Demo Holded ${connector}`}
        allow="autoplay"
      />
      {/* Scene progress dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {SCENES.map((_, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 pointer-events-auto ${
              i === index ? `w-5 ${dotActive}` : 'w-1.5 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Escena ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
