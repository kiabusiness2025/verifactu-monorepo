/**
 * Genera el vídeo de intro VERTICAL 9:16 para Instagram Reels con Sora.
 *
 * Uso:
 *   node scripts/generate-reels-sora.mjs
 *
 * Variables de entorno (.env.local):
 *   SORA_API_KEY  — clave OpenAI con acceso a Sora
 *
 * Salida:
 *   docs/video-assets/reels-intro-sora.mp4
 *
 * Textos a añadir en post-producción (Sora no renderiza español con precisión):
 *   Escena 3 chat:  "¿Cuál ha sido la facturación de este mes?"
 *                   "Tu facturación ha aumentado un 15% respecto al mes anterior."
 *   Escena 4 cards: Facturas · Clientes · Ingresos · Gastos · Informes · Proyectos
 *   Escena 5:       "Tú decides qué datos conectar."
 *   Escena 6 hero:  "Conector ChatGPT con Holded"
 *                   "La información de tu empresa, al alcance de tu conversación."
 *                   CTA: "Conecta tu cuenta"
 *                   URL: "holded.verifactu.business/conectores/chatgpt"
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
//
// Composición vertical 9:16 — jerarquía de arriba a abajo:
//   1. Iconos (top)  →  2. Chat (mid)  →  3. Feature cards  →  4. Hero (full)
//
const PROMPT = `
Premium vertical 9:16 portrait animation, 10 seconds, no audio, optimized for Instagram Reels. Modern SaaS business-tech aesthetic.

Soft mint-green gradient background flowing top to bottom: pastel #d1fae5 at the top fading to near-white at the bottom. Clean bright studio lighting. Professional and elegant.

The animation opens in portrait orientation. In the upper third of the frame, two white rounded glassmorphism cards float side by side: the left card holds a 3D green chat-bubble icon, the right card holds a red geometric diamond business logo. Both cards levitate gently. A glowing green connector line grows horizontally between them, with tiny bright data particles streaming through it. Very faint blurred UI outlines drift softly in the background: invoice shapes, bar charts, document silhouettes — barely visible, atmospheric.

The camera begins a smooth slow zoom-in toward the center. A clean white chat interface card fills the middle of the frame: a dark green user message bubble on one side, a white assistant response card on the other with bold highlighted text. Minimal, elegant, readable.

Below the chat interface, a 2-column grid of small feature cards appears with smooth staggered animation: each card has a tiny icon and a short label area. Six cards total in three rows.

A brief security moment: a white panel with a glowing green shield, a lock icon, and a permission toggle — calm and controlled.

Final hero composition fills the full vertical frame: the two logo cards reappear at the top connected by a glowing green arc, a large bold centered title text zone below, a subtitle line, a dark green CTA button, and a small mint URL at the very bottom. The mint gradient brightens warmly. The composition holds, polished.

Smooth cinematic camera movement. Gentle parallax depth. Visual hierarchy flows naturally from top to bottom for portrait mobile viewing. No people. No voiceover. No rendered text in frame.
`.trim();

// ── Output ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = resolve(__dir, '../docs/video-assets');
const OUTPUT = resolve(OUTPUT_DIR, 'reels-intro-sora.mp4');
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
  console.log('\n🎬 Creando intro Reels vertical 9:16 con Sora...');
  console.log(`   ${PROMPT.slice(0, 90)}…\n`);

  const job = await openai.videos.create({
    model: 'sora-2',
    prompt: PROMPT,
    seconds: '10',
    size: '720x1280',   // vertical 9:16
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
  console.log('\nTextos para overlays en post-producción:');
  console.log('  Chat user: "¿Cuál ha sido la facturación de este mes?"');
  console.log('  Chat AI:   "Tu facturación ha aumentado un 15%..."');
  console.log('  Cards:     Facturas · Clientes · Ingresos · Gastos · Informes · Proyectos');
  console.log('  Security:  "Tú decides qué datos conectar."');
  console.log('  Hero:      "Conector ChatGPT con Holded"');
  console.log('             "La información de tu empresa, al alcance de tu conversación."');
  console.log('  CTA:       "Conecta tu cuenta"');
  console.log('  URL:       "holded.verifactu.business/conectores/chatgpt"');
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message ?? err);
  process.exit(1);
});
