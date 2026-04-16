'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';

export type DemoClip = {
  id: string;
  slug: string;
  label: string;
  title: string;
  description: string;
};

function VideoPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <Play className="h-5 w-5 text-slate-400" />
        </div>
        <div className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label} — clip en preparacion
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ clip, variant }: { clip: DemoClip; variant: '16x9' | '9x16' }) {
  const [failed, setFailed] = useState(false);
  const src = `/demo/${clip.slug}-${variant}.mp4`;
  const isPortrait = variant === '9x16';
  const aspectClass = isPortrait ? 'aspect-[9/16]' : 'aspect-video';

  if (failed) {
    return (
      <div className={`w-full ${aspectClass}`}>
        <VideoPlaceholder label={clip.label} />
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      className={`w-full bg-slate-100 object-cover ${aspectClass}`}
      aria-label={clip.title}
      onError={() => setFailed(true)}
    />
  );
}

function VideoCard({ clip, showPortrait = false }: { clip: DemoClip; showPortrait?: boolean }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className={`relative ${showPortrait ? 'hidden md:block' : ''}`}>
        <VideoPlayer clip={clip} variant="16x9" />
      </div>

      {showPortrait && (
        <div className="relative md:hidden">
          <div className="mx-auto max-w-xs">
            <VideoPlayer clip={clip} variant="9x16" />
          </div>
        </div>
      )}

      <div className="px-5 pb-6 pt-4">
        <div className="inline-flex rounded-full bg-[#ff5460]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
          {clip.label}
        </div>
        <div className="mt-2 text-base font-semibold text-slate-900">{clip.title}</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">{clip.description}</p>
      </div>
    </article>
  );
}

type Props = {
  heroClip: DemoClip;
  useCaseClips: DemoClip[];
};

export default function DemoVideoGrid({ heroClip, useCaseClips }: Props) {
  return (
    <>
      {/* Hero clip */}
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_32px_90px_-48px_rgba(255,84,96,0.3)]">
          <div className="hidden md:block">
            <VideoPlayer clip={heroClip} variant="16x9" />
          </div>
          <div className="mx-auto max-w-xs md:hidden">
            <VideoPlayer clip={heroClip} variant="9x16" />
          </div>
          <div className="border-t border-slate-100 px-7 py-5">
            <div className="text-sm font-semibold text-slate-900">{heroClip.title}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{heroClip.description}</p>
          </div>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Casos de uso disponibles hoy
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Cada clip muestra un caso real disponible hoy. Lo que ves es lo que puedes pedir desde el
          primer dia, gratis.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {useCaseClips.map((clip) => (
            <VideoCard key={clip.id} clip={clip} showPortrait />
          ))}
        </div>
      </section>
    </>
  );
}
