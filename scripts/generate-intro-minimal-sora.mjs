/**
 * Genera el vídeo de intro MINIMALISTA con la API de OpenAI (Sora).
 *
 * Uso:
 *   node scripts/generate-intro-minimal-sora.mjs
 *
 * Variables de entorno (se cargan desde .env.local):
 *   SORA_API_KEY  — clave OpenAI con acceso a Sora
 *
 * Salida:
 *   docs/video-assets/intro-minimal-sora.mp4
 *
 * Textos a añadir en post-producción (overlay en CapCut / DaVinci):
 *   Título:   "ChatGPT + Holded"
 *   Subtítulo:"Conecta tus datos. Pregunta. Decide."
 *   Label:    "Tutorial práctico"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env.local');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
  console.log('✓ .env.local cargado');
}

const API_KEY = process.env.SORA_API_KEY;
if (!API_KEY) {
  console.error('✗ Falta SORA_API_KEY en .env.local');
  process.exit(1);
}

// ── Prompt ───────────────────────────────────────────────────────────────────
const PROMPT = `
Minimalist premium SaaS intro animation, horizontal 16:9, 5 seconds, no audio, no text in frame.

Soft mint-green and white gradient background, clean and airy. Bright studio lighting.

A white rounded glassmorphism card with a green chat-bubble icon floats on the left. A matching white card with a red geometric diamond logo floats on the right. Very faint blurred UI shapes drift in the background: invoice outlines, bar chart silhouettes, document cards — barely visible, soft focus.

A glowing green connector line grows horizontally between the two cards. Tiny bright data particles flow along it.

The two cards drift smoothly toward the center, settling side by side. A soft radial mint glow blooms between them at the moment they meet.

The camera performs a very slow, smooth zoom-in toward the center. The final frame is still, balanced, and polished: two white cards connected by a glowing green line, floating on the luminous gradient. A centered text area glows below — reserved for title overlays in post-production.

No people. No clutter. No voiceover. Elegant, modern, breathable.
`.trim();

// ── Output ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = resolve(__dir, '../docs/video-assets');
const OUTPUT = resolve(OUTPUT_DIR, 'intro-minimal-sora.mp4');
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: API_KEY });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function pollUntilDone(videoId) {
  const MAX = 72;
  for (let i = 1; i <= MAX; i++) {
    await sleep(5000);
    const vid = await openai.videos.retrieve(videoId);
    const pct = Math.round(vid.progress ?? 0);
    console.log(`  [${i}/${MAX}] status=${vid.status} progress=${pct}%`);
    if (vid.status === 'completed') return vid;
    if (vid.status === 'failed') throw new Error(`Sora falló: ${JSON.stringify(vid.error ?? vid)}`);
  }
  throw new Error('Timeout >6 min esperando Sora');
}

async function main() {
  console.log('\n🎬 Creando intro minimalista con Sora...');
  console.log(`   ${PROMPT.slice(0, 90)}…\n`);

  const job = await openai.videos.create({
    model: 'sora-2',
    prompt: PROMPT,
    seconds: '4',
    size: '1280x720',
  });

  console.log(`✓ Job creado: ${job.id} (status=${job.status})`);

  let finalJob = job;
  if (job.status !== 'completed') {
    console.log('  Esperando generación (puede tardar 2-5 min)…');
    finalJob = await pollUntilDone(job.id);
  }

  console.log('✓ Completado. Descargando vídeo…');
  const response = await openai.videos.downloadContent(finalJob.id);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(OUTPUT, buffer);

  console.log(`\n✅ Guardado en: ${OUTPUT}`);
  console.log('\nTexto a añadir en post-producción (overlays):');
  console.log('  Título:    "ChatGPT + Holded"');
  console.log('  Subtítulo: "Conecta tus datos. Pregunta. Decide."');
  console.log('  Label:     "Tutorial práctico"');
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message ?? err);
  process.exit(1);
});
