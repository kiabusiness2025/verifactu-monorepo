/**
 * Genera el vídeo de outro con la API de OpenAI (Sora).
 *
 * Uso:
 *   node scripts/generate-outro-sora.mjs
 *
 * Variables de entorno (se cargan desde .env.local):
 *   SORA_API_KEY  — clave OpenAI con acceso a Sora
 *
 * Salida:
 *   docs/video-assets/outro-sora.mp4
 *
 * Texto a añadir en post-producción (Sora no renderiza texto con precisión):
 *   - "Conector ChatGPT con Holded"
 *   - "Powered by verifactu.business"
 *   - URL: "holded.verifactu.business/conectores/chatgpt"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// ── Load .env.local ──────────────────────────────────────────────────────────
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
//
// IMPORTANT — TEXT OVERLAYS (add in post-production):
//   Line 1: "Conector ChatGPT con Holded"
//   Line 2: "Powered by verifactu.business"
//   Line 3: "holded.verifactu.business/conectores/chatgpt"
//
const PROMPT = `
Premium horizontal 16:9 SaaS product outro video, 8 seconds, no audio, no text in frame.

Visual style: soft mint-green gradient background (#d1fae5 to near-white #f9fafb), matching the intro's visual language. Clean studio lighting. Polished, warm, satisfying conclusion.

Opening: the luminous mint gradient fills the frame, slightly brighter and more open than before. A soft radial glow pulses gently at center screen.

A white rounded-corner card with a 3D green chat-bubble icon slides in smoothly from the left. A matching white card with a red geometric diamond business logo slides in from the right. Both cards settle in the center, side by side, connected by a glowing green arc with a warm bloom. The connection point pulses softly with a radial mint-green glow.

Below the logo pair, a large centered text zone glows — this area is reserved for a bold title overlay to be added in post-production. Below that, a smaller secondary text zone for a brand line. At the very bottom, a small URL zone in mint green.

The entire composition holds for 3 seconds: two cards, glowing arc, text zones, on the soft mint gradient. Calm, professional, memorable.

In the final second, the background gently brightens toward white — a clean, elegant fade-to-white conclusion. The logo cards and arc fade last, leaving a pristine white frame.

Camera: static, centered, no drift. Lighting: warm bloom at center, clean studio ambience. No people. No voiceover. No music. No rendered text in frame.
`.trim();

// ── Output ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = resolve(__dir, '../docs/video-assets');
const OUTPUT = resolve(OUTPUT_DIR, 'outro-sora.mp4');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Client ───────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: API_KEY });

// ── Poll until complete ───────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntilDone(videoId) {
  const MAX = 72; // ~6 min (72 × 5 s)
  for (let i = 1; i <= MAX; i++) {
    await sleep(5000);
    const vid = await openai.videos.retrieve(videoId);
    const pct = Math.round(vid.progress ?? 0);
    console.log(`  [${i}/${MAX}] status=${vid.status} progress=${pct}%`);
    if (vid.status === 'completed') return vid;
    if (vid.status === 'failed') {
      throw new Error(`Sora falló: ${JSON.stringify(vid.error ?? vid)}`);
    }
  }
  throw new Error('Timeout >6 min esperando Sora');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎬 Creando job de outro con Sora...');
  console.log(`   ${PROMPT.slice(0, 90)}…\n`);

  const job = await openai.videos.create({
    model: 'sora-2',
    prompt: PROMPT,
    seconds: '8',
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
  console.log('\nTexto a añadir en post-producción:');
  console.log('  Título:   "Conector ChatGPT con Holded"');
  console.log('  Subtítulo:"Powered by verifactu.business"');
  console.log('  URL:      "holded.verifactu.business/conectores/chatgpt"');
  console.log('\nSiguiente paso:');
  console.log('  CapCut / DaVinci: intro-sora.mp4 → demo.mp4 → outro-sora.mp4');
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message ?? err);
  process.exit(1);
});
