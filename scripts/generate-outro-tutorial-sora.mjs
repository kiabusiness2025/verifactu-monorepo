/**
 * Genera el outro de TUTORIAL horizontal 16:9 con Sora.
 *
 * Uso:
 *   node scripts/generate-outro-tutorial-sora.mjs
 *
 * Variables de entorno (.env.local):
 *   SORA_API_KEY  — clave OpenAI con acceso a Sora
 *
 * Salida:
 *   docs/video-assets/outro-tutorial-sora.mp4
 *
 * Textos a añadir como overlays (Sora no renderiza español con precisión):
 *   "Gracias por ver"
 *   "ChatGPT + Holded"
 *   "Powered by verifactu.business"
 *   "Co-produced with Claude Sonnet and OpenAI Codex"
 *   CTA: "Más tutoriales en verifactu.business"
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
Minimalist premium SaaS tutorial outro, horizontal 16:9, 6 seconds, no audio, no text in frame.

Soft mint-green and white gradient background, bright clean studio lighting, professional and calm.

A very subtle glowing connector line stretches horizontally across the center of the frame. Tiny gentle data particles drift slowly along the line — unhurried, atmospheric.

The camera performs a very slow, smooth gentle zoom-out from 1.04x to 1.00x, giving a calm retreating feeling.

A single large rounded white glassmorphism card fades in at center, with a soft drop shadow and subtle backdrop blur. The card is clean and minimal, with ample padding — it holds space for text overlays that will be added in post-production. The card glows very softly with a mint-green ambient light at its base.

The overall mood: calm, elegant, satisfying, premium. A polished conclusion. The background gradient glows very softly. Everything is still and resolved. No movement except the slow zoom-out and gentle particles.

No people. No voiceover. No music. No rendered text in frame. Clean, minimal, professional.
`.trim();

// ── Output ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = resolve(__dir, '../docs/video-assets');
const OUTPUT = resolve(OUTPUT_DIR, 'outro-tutorial-sora.mp4');
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
  console.log('\n🎬 Creando outro de tutorial horizontal 16:9 con Sora...');
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
  console.log('\nOverlays para post-producción (CapCut / DaVinci):');
  console.log('  Label:    "Gracias por ver"');
  console.log('  Título:   "ChatGPT + Holded"');
  console.log('  Footer:   "Powered by verifactu.business"');
  console.log('  Credits:  "Co-produced with Claude Sonnet and OpenAI Codex"');
  console.log('  CTA:      "Más tutoriales en verifactu.business"');
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message ?? err);
  process.exit(1);
});
