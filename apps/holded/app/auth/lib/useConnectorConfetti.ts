/**
 * Confetti animation hook for "connector activated" success state.
 *
 * Triggered by HoldedClaudeForm / HoldedDirectForm when the user completes
 * step 2 successfully (API key validated and saved). Plays for ~800ms with
 * two emitters from the bottom-left and bottom-right corners, then auto-stops.
 *
 * Implementation notes:
 *   - Vanilla canvas particles (no dependency on canvas-confetti or similar),
 *     so we don't add a new dep to apps/holded for what is essentially a
 *     celebratory micro-interaction.
 *   - Canvas is a fixed-position overlay with pointer-events: none so it
 *     never blocks clicks on the form.
 *   - Respects `prefers-reduced-motion: reduce` — users with motion sensitivity
 *     don't see the animation at all (still see the static success banner).
 *   - Uses the brand palette of the connector (amber for Claude, emerald +
 *     coral for ChatGPT) — pass the `colors` option.
 *   - The hook is fire-and-forget: call `play()` and forget. Multiple
 *     overlapping calls are coalesced (the existing animation keeps running).
 */

import { useCallback, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRotation: number;
  color: string;
  life: number;
  maxLife: number;
};

type PlayOptions = {
  /** Hex colors used for the particles. Defaults to a generic celebratory palette. */
  colors?: string[];
  /** Total animation duration in ms. Defaults to 1500 (1.5s) — slightly longer than the redirect delay so confetti finishes before the page unloads. */
  durationMs?: number;
};

const DEFAULT_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899'];

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useConnectorConfetti() {
  const isPlayingRef = useRef(false);

  const play = useCallback((options: PlayOptions = {}) => {
    if (typeof window === 'undefined') return;
    if (isPlayingRef.current) return; // Coalesce overlapping calls.
    if (prefersReducedMotion()) return;

    isPlayingRef.current = true;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:9999',
      'width:100vw',
      'height:100vh',
    ].join(';');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isPlayingRef.current = false;
      return;
    }

    function resize() {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    document.body.appendChild(canvas);

    const colors = options.colors && options.colors.length > 0 ? options.colors : DEFAULT_COLORS;
    const durationMs = options.durationMs ?? 1500;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const particles: Particle[] = [];

    // Two burst sources at bottom-left and bottom-right corners.
    const sources = [
      { x: 0, y: h, angleMin: -Math.PI / 3, angleMax: -Math.PI / 6 }, // bottom-left, shoot up-right
      { x: w, y: h, angleMin: Math.PI + Math.PI / 6, angleMax: Math.PI + Math.PI / 3 }, // bottom-right, shoot up-left
    ];

    const PARTICLES_PER_SOURCE = 80;
    for (const src of sources) {
      for (let i = 0; i < PARTICLES_PER_SOURCE; i++) {
        const angle = src.angleMin + Math.random() * (src.angleMax - src.angleMin);
        const speed = 8 + Math.random() * 12;
        particles.push({
          x: src.x,
          y: src.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 6,
          rotation: Math.random() * Math.PI * 2,
          vRotation: (Math.random() - 0.5) * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
          life: 0,
          maxLife: durationMs,
        });
      }
    }

    const start = performance.now();
    function frame(now: number) {
      const elapsed = now - start;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (const p of particles) {
        p.life = elapsed;
        if (p.life > p.maxLife) continue;
        alive++;

        // Physics: gravity + air drag.
        p.vy += 0.35; // gravity
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        // Fade out near end of life.
        const lifeRatio = p.life / p.maxLife;
        const alpha = lifeRatio < 0.7 ? 1 : 1 - (lifeRatio - 0.7) / 0.3;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        // Rectangular confetti (más Holded-style que círculos).
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (alive > 0 && elapsed < durationMs + 200) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
        isPlayingRef.current = false;
      }
    }
    requestAnimationFrame(frame);
  }, []);

  return { play };
}
