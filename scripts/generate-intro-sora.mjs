/**
 * Genera el vídeo de intro con la API de OpenAI (Sora).
 *
 * Uso:
 *   node scripts/generate-intro-sora.mjs
 *
 * Variables de entorno (se cargan desde .env.local):
 *   SORA_API_KEY  — clave OpenAI con acceso a Sora
 *
 * Salida:
 *   docs/video-assets/intro-sora.mp4
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
const PROMPT = `
Professional tech product intro animation, 8 seconds, clean white background with light green tint.

Scene: Two logos enter from opposite sides and merge.
- Left side: a red diamond logo (Holded ERP) slides in from the left with a soft shadow.
- Right side: the official ChatGPT logo (black circle with OpenAI symbol) slides in from the right.
- Both logos move toward the center, briefly overlap, then a bright white flash pulses.
- After the flash: both logos appear smaller side-by-side in the upper center.
- Large bold dark navy text fades in below: "Holded para ChatGPT"
- Smaller subtitle in blue: "by verifactu.business"
- A thin gradient progress bar (left: green #10a37f → right: blue #2361d8) fills left to right at the bottom.
- Style: clean, minimal, modern SaaS. White background with subtle light-green tint (#f0faf7). Smooth easing. No voice-over.
`.trim();

// ── Output ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = resolve(__dir, '../docs/video-assets');
const OUTPUT = resolve(OUTPUT_DIR, 'intro-sora.mp4');

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
  console.log('\n🎬 Creando job de vídeo con Sora...');
  console.log(`   ${PROMPT.slice(0, 90)}…\n`);

  // sora-2 supports seconds: '4' | '8' | '12'  and  size: '1280x720' (landscape)
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
  console.log('\nSiguiente paso:');
  console.log('  CapCut / DaVinci: intro-sora.mp4 → demo.mp4 → outro.mp4');
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message ?? err);
  process.exit(1);
});
