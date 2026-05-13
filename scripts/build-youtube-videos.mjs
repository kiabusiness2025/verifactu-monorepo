/**
 * build-youtube-videos.mjs
 *
 * Añade intro + outro a los dos vídeos de demostración para subir a YouTube.
 *
 * Entrada  (docs/video-assets/YouTube/):
 *   · ChatGPT - 13 May 2026.mp4
 *   · Claude  - 13 May 2026.mp4
 *
 * Salida   (docs/video-assets/YouTube/):
 *   · ChatGPT - Holded Demo - Mayo 2026.mp4
 *   · Claude  - Holded Demo - Mayo 2026.mp4
 *
 * Uso:
 *   node scripts/build-youtube-videos.mjs
 *   pnpm video:youtube
 *
 * Requiere: playwright (ya instalado), ffmpeg (winget install Gyan.FFmpeg)
 */

import { chromium } from 'playwright';
import { execSync, spawnSync } from 'child_process';
import {
  mkdirSync, existsSync, readdirSync,
  writeFileSync, unlinkSync,
} from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');
const DOCS  = resolve(ROOT, 'docs', 'video-assets');
const YT    = resolve(DOCS, 'YouTube');
const TMP   = resolve(ROOT, '.tmp-youtube');

mkdirSync(TMP, { recursive: true });

// ── FFmpeg discovery ──────────────────────────────────────────────────────────
function findFFmpeg() {
  const base = join(
    process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local',
    'Microsoft', 'WinGet', 'Packages'
  );
  if (existsSync(base)) {
    for (const pkg of readdirSync(base)) {
      if (!pkg.startsWith('Gyan.FFmpeg')) continue;
      const bin = join(base, pkg);
      for (const ver of readdirSync(bin).sort().reverse()) {
        const ffmpeg = join(bin, ver, 'bin', 'ffmpeg.exe');
        if (existsSync(ffmpeg)) return ffmpeg;
      }
    }
  }
  for (const c of ['ffmpeg', 'C:\\ffmpeg\\bin\\ffmpeg.exe']) {
    try { execSync(`"${c}" -version`, { stdio: 'pipe' }); return c; } catch {}
  }
  throw new Error('FFmpeg no encontrado. Instálalo con: winget install Gyan.FFmpeg');
}

const FFMPEG = findFFmpeg();
console.log('✓ FFmpeg:', FFMPEG);

function ff(args, opts = {}) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, ...opts });
  if (r.status !== 0) {
    console.error('FFmpeg stderr:', r.stderr?.slice(-800));
    throw new Error(`FFmpeg failed (exit ${r.status})`);
  }
  return r;
}

// ── 1. Record HTML slide with Playwright ────────────────────────────────────
async function recordHtml({ htmlPath, outMp4, durationMs, width = 1920, height = 1080 }) {
  console.log(`\n🎬 Grabando: ${basename(htmlPath)} (${durationMs / 1000}s)…`);

  const recDir = join(TMP, 'rec_' + Date.now());
  mkdirSync(recDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: recDir, size: { width, height } },
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/').replace(/^\//, '');
  await page.goto(fileUrl);
  await page.waitForTimeout(durationMs + 500);

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  await new Promise(r => setTimeout(r, 1000));

  ff([
    '-y', '-i', videoPath,
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=#F5F0E8`,
    '-r', '30',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-an',
    outMp4,
  ]);

  try { unlinkSync(videoPath); } catch {}
  console.log(`  ✓ ${basename(outMp4)}`);
  return outMp4;
}

// ── 2. Trim long pauses ───────────────────────────────────────────────────────
function trimPauses(inputMp4, outputMp4, freezeThresholdSec = 2.5) {
  console.log(`\n✂️  Analizando pausas…`);

  const probe = spawnSync(FFMPEG, [
    '-i', inputMp4,
    '-vf', `freezedetect=n=-60dB:d=${freezeThresholdSec}`,
    '-map', '0:v', '-f', 'null', '-',
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  const stderr = (probe.stderr || '') + (probe.stdout || '');
  const startRe = /freeze_start: ([\d.]+)/g;
  const endRe   = /freeze_end: ([\d.]+)/g;
  const starts = [], ends = [];
  let ms, me;
  while ((ms = startRe.exec(stderr))) starts.push(parseFloat(ms[1]));
  while ((me = endRe.exec(stderr)))   ends.push(parseFloat(me[1]));

  const freezes = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    const duration = ends[i] - starts[i];
    if (duration > freezeThresholdSec) freezes.push({ start: starts[i], end: ends[i], duration });
  }

  if (freezes.length === 0) {
    console.log('  Sin pausas largas — usando vídeo original.');
    ff(['-y', '-i', inputMp4, '-c', 'copy', outputMp4]);
    return outputMp4;
  }

  console.log(`  ${freezes.length} pausa(s) detectadas:`);
  freezes.forEach(f => console.log(`    ${f.start.toFixed(1)}s → ${f.end.toFixed(1)}s (${f.duration.toFixed(1)}s)`));

  const keepPause = 0.8;
  let keeps = [];
  let cursor = 0;
  for (const f of freezes) {
    keeps.push([cursor, f.start + keepPause]);
    cursor = f.end;
  }

  const durProbe = spawnSync(FFMPEG, [
    '-v', 'quiet', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    '-i', inputMp4,
  ], { encoding: 'utf8' });
  const total = parseFloat((durProbe.stdout || '180').trim()) || 180;
  keeps.push([cursor, total]);

  const segments = keeps.filter(([s, e]) => e > s);
  const savedSec = freezes.reduce((a, f) => a + Math.max(0, f.duration - keepPause), 0);
  console.log(`  Recortando ${segments.length} segmentos, eliminando ${savedSec.toFixed(1)}s…`);

  const segFiles = [];
  for (let i = 0; i < segments.length; i++) {
    const [start, end] = segments[i];
    const segOut = join(TMP, `seg_${i}.mp4`);
    ff([
      '-y', '-i', inputMp4,
      '-ss', String(start), '-to', String(end),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-c:a', 'aac', '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      segOut,
    ]);
    segFiles.push(segOut);
  }

  const concatList = join(TMP, 'seg_concat.txt');
  writeFileSync(concatList, segFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  ff(['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', outputMp4]);
  segFiles.forEach(f => { try { unlinkSync(f); } catch {} });

  console.log(`  ✓ ${basename(outputMp4)}`);
  return outputMp4;
}

// ── 3. Concatenate intro + main + outro ───────────────────────────────────────
function concatenate(introMp4, mainMp4, outroMp4, outputMp4) {
  console.log('\n🎞️  Concatenando…');

  const introAudio = join(TMP, 'intro_audio.mp4');
  const outroAudio = join(TMP, 'outro_audio.mp4');
  const mainNorm   = join(TMP, 'main_norm.mp4');

  const addSilentAudio = (input, output) =>
    ff(['-y', '-i', input,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
        '-shortest', output]);

  const normalizeMain = (input, output) =>
    ff(['-y', '-i', input,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#F5F0E8',
        '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        output]);

  console.log('  Normalizando intro…');  addSilentAudio(introMp4, introAudio);
  console.log('  Normalizando outro…');  addSilentAudio(outroMp4, outroAudio);
  console.log('  Normalizando main…');   normalizeMain(mainMp4, mainNorm);

  const concatList = join(TMP, 'final_concat.txt');
  writeFileSync(concatList, [
    `file '${introAudio.replace(/\\/g, '/')}'`,
    `file '${mainNorm.replace(/\\/g, '/')}'`,
    `file '${outroAudio.replace(/\\/g, '/')}'`,
  ].join('\n'));

  ff(['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', outputMp4]);
  console.log(`  ✓ ${basename(outputMp4)}`);
}

// ── Video configs ─────────────────────────────────────────────────────────────
const VIDEOS = [
  {
    label:    'ChatGPT',
    introHtml: resolve(DOCS, 'intro-chatgpt-holded.html'),
    outroHtml: resolve(DOCS, 'outro-verifactu-business.html'),
    introDurationMs: 12000,
    outroDurationMs: 8000,
    mainInput:  resolve(YT, 'ChatGPT - 13 May 2026.mp4'),
    finalOutput: resolve(YT, 'ChatGPT - Holded Demo - Mayo 2026.mp4'),
  },
  {
    label:    'Claude',
    introHtml: resolve(DOCS, 'intro-claude-holded.html'),
    outroHtml: resolve(DOCS, 'outro-claude-holded.html'),
    introDurationMs: 12000,
    outroDurationMs: 8000,
    mainInput:  resolve(YT, 'Claude - 13 May 2026.mp4'),
    finalOutput: resolve(YT, 'Claude - Holded Demo - Mayo 2026.mp4'),
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  for (const cfg of VIDEOS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${cfg.label} connector — YouTube build`);
    console.log(`${'═'.repeat(60)}`);

    if (!existsSync(cfg.mainInput)) {
      console.warn(`  ⚠️  Vídeo principal no encontrado: ${basename(cfg.mainInput)}`);
      console.warn('  Saltando…\n');
      continue;
    }

    const introMp4   = resolve(TMP, `intro_${cfg.label}.mp4`);
    const outroMp4   = resolve(TMP, `outro_${cfg.label}.mp4`);
    const mainTrimmed = resolve(TMP, `main_trimmed_${cfg.label}.mp4`);

    await recordHtml({ htmlPath: cfg.introHtml, outMp4: introMp4, durationMs: cfg.introDurationMs });
    await recordHtml({ htmlPath: cfg.outroHtml, outMp4: outroMp4, durationMs: cfg.outroDurationMs });
    trimPauses(cfg.mainInput, mainTrimmed);
    concatenate(introMp4, mainTrimmed, outroMp4, cfg.finalOutput);

    console.log(`\n✅ Guardado: ${cfg.finalOutput}`);
  }

  // Cleanup
  try {
    for (const f of readdirSync(TMP)) { try { unlinkSync(join(TMP, f)); } catch {} }
  } catch {}

  console.log('\n\n🎬 Todos los vídeos generados. Listos para subir a YouTube.');
  console.log('\n  ChatGPT: docs/video-assets/YouTube/ChatGPT - Holded Demo - Mayo 2026.mp4');
  console.log('  Claude:  docs/video-assets/YouTube/Claude  - Holded Demo - Mayo 2026.mp4\n');
}

main().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
