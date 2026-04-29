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
//
// IMPORTANT — TEXT OVERLAYS (add in post-production, Sora cannot render Spanish reliably):
//   Scene 3 chat:   "¿Cuál ha sido la facturación de este mes?"
//                   "Tu facturación ha aumentado un 15% respecto al mes anterior."
//   Scene 4 cards:  Facturas · Clientes · Ingresos · Gastos · Informes · Proyectos
//   Scene 5 panel:  "Tú decides qué datos conectar."
//   Scene 6 hero:   "Conector ChatGPT con Holded"
//                   "La información de tu empresa, al alcance de tu conversación."
//                   CTA: "Conecta tu cuenta"
//                   URL: "holded.verifactu.business/conectores/chatgpt"
//
const PROMPT = `
Premium horizontal 16:9 SaaS product intro video, 10 seconds, no audio, no text in frame.

Visual style: soft mint-green gradient background (pastel #d1fae5 transitioning to near-white #f9fafb), bright clean studio lighting, polished business-tech aesthetic. White glassmorphism cards with rounded corners, soft drop shadows, subtle 3D depth. ChatGPT green (#10a37f) accent glows. Dark navy typography zone at the bottom.

Opening wide shot: the luminous mint gradient fills the frame. On the left, a white rounded-corner card floats gently — it holds a 3D green chat-bubble icon with a soft ambient glow. On the right, a matching white card floats with a red geometric diamond business logo. Both cards levitate independently with slow parallax breathing, separated by open space. Subtle reflective highlights on the card surfaces.

A thin luminous green connector line grows horizontally from the left card to the right card, spanning the frame. Small bright data particles — tiny glowing dots — travel along the line in a continuous stream. Behind both cards, semi-transparent glassmorphism panels drift in gently: an invoice summary panel, a bar chart card, a contacts list card, a financial report panel. All are white with rounded corners, backdrop blur, and soft mint-green accents.

The camera slowly drifts forward with cinematic ease. A clean desktop chat interface card rises to center frame: a minimal conversation UI showing a dark green user message bubble on one side, a white assistant response card on the other, with a bold number visible. Elegant, crisp, readable.

From both sides of the frame, small horizontal white cards slide in smoothly with soft parallax — each card has a minimalist icon and a short label area. They arrange into two floating rows flanking the chat interface, creating a product showcase composition.

A brief security beat: a clean white UI panel with a glowing green shield icon, a lock icon, and a permission toggle appears center-frame, calm and controlled.

Final hero frame: both white logo cards appear centered and connected by a glowing green arc with a soft radial bloom. Below, a large bold title text zone glows. The mint gradient brightens warmly. The composition holds steady, polished, triumphant.

Camera motion: smooth cinematic horizontal drift, slow zoom-in, gentle parallax depth layers. Lighting: bright, clean, premium with soft reflections and subtle bloom. No people. No voiceover. No music. No rendered text.
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
    seconds: '10',
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
