/**
 * build-demo-video.mjs
 *
 * Pipeline completo:
 *   1. Graba intro-chatgpt-holded.html con Playwright (logos reales)
 *   2. Graba outro-tutorial.html con Playwright
 *   3. Detecta y elimina pausas largas del vídeo principal con FFmpeg freezedetect
 *   4. Concatena: intro + main_trimmed + outro
 *   5. Guarda en apps/holded/public/video/holded-chatgpt-demo.mp4
 *
 * Uso:
 *   node scripts/build-demo-video.mjs
 *   pnpm video:build-demo
 *
 * Requiere: playwright (ya instalado), ffmpeg (winget)
 */

import { chromium } from 'playwright';
import { execSync, spawnSync } from 'child_process';
import {
  mkdirSync, existsSync, readdirSync, renameSync,
  writeFileSync, unlinkSync, readFileSync
} from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__dir, '..');
const DOCS   = resolve(ROOT, 'docs', 'video-assets');
const PUBLIC = resolve(ROOT, 'apps', 'holded', 'public', 'video');
const TMP    = resolve(ROOT, '.tmp-video');

mkdirSync(TMP, { recursive: true });
mkdirSync(PUBLIC, { recursive: true });

// ── FFmpeg discovery ─────────────────────────────────────────────────────────
function findFFmpeg() {
  // winget install path (Gyan.FFmpeg)
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
  // chocolatey / scoop / PATH fallback
  for (const candidate of ['ffmpeg', 'C:\\ffmpeg\\bin\\ffmpeg.exe', 'C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin\\ffmpeg.exe']) {
    try { execSync(`"${candidate}" -version`, { stdio: 'pipe' }); return candidate; } catch {}
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

// ── 1. Record HTML with Playwright ───────────────────────────────────────────
async function recordHtml({ htmlPath, outMp4, durationMs, width = 1920, height = 1080 }) {
  console.log(`\n🎬 Grabando: ${basename(htmlPath)} (${durationMs/1000}s)…`);

  const recDir = join(TMP, 'rec_' + Date.now());
  mkdirSync(recDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: recDir, size: { width, height } },
  });

  const page = await context.newPage();

  // File URL — handle Windows paths
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/').replace(/^\//, '');
  await page.goto(fileUrl);

  // Wait for animation to complete + 0.5s buffer
  await page.waitForTimeout(durationMs + 500);

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  // Wait briefly for file to flush
  await new Promise(r => setTimeout(r, 1000));

  // Convert webm → mp4 (h264, silent audio track, 30fps, 1920×1080)
  console.log(`  Convirtiendo webm → mp4…`);
  ff([
    '-y', '-i', videoPath,
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=#f0fdf4`,
    '-r', '30',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-an',  // no audio (intro/outro are silent)
    outMp4
  ]);

  try { unlinkSync(videoPath); } catch {}
  console.log(`  ✓ Guardado: ${basename(outMp4)}`);
  return outMp4;
}

// ── 2. Trim long pauses in main video ────────────────────────────────────────
function trimPauses(inputMp4, outputMp4, freezeThresholdSec = 2.5) {
  console.log(`\n✂️  Analizando pausas en vídeo principal…`);

  // Detect frozen frames
  const probe = spawnSync(FFMPEG, [
    '-i', inputMp4,
    '-vf', `freezedetect=n=-60dB:d=${freezeThresholdSec}`,
    '-map', '0:v', '-f', 'null', '-'
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  const stderr = (probe.stderr || '') + (probe.stdout || '');
  const freezes = [];
  const startRe = /freeze_start: ([\d.]+)/g;
  const endRe   = /freeze_end: ([\d.]+)/g;
  let ms, me;
  const starts = [], ends = [];
  while ((ms = startRe.exec(stderr))) starts.push(parseFloat(ms[1]));
  while ((me = endRe.exec(stderr)))   ends.push(parseFloat(me[1]));

  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    const duration = ends[i] - starts[i];
    if (duration > freezeThresholdSec) {
      freezes.push({ start: starts[i], end: ends[i], duration });
    }
  }

  if (freezes.length === 0) {
    console.log('  No se encontraron pausas largas — usando vídeo original.');
    // Copy instead of re-encode to preserve quality
    ff(['-y', '-i', inputMp4, '-c', 'copy', outputMp4]);
    return outputMp4;
  }

  console.log(`  Encontradas ${freezes.length} pausa(s):`);
  freezes.forEach(f => console.log(`    ${f.start.toFixed(1)}s → ${f.end.toFixed(1)}s (${f.duration.toFixed(1)}s)`));

  // Build select filter to skip freeze sections (keep 1s at start of each freeze for natural feel)
  // Strategy: for each freeze of D seconds, keep first 0.8s and cut the rest
  const keepPause = 0.8; // seconds to keep at the start of each pause

  // Build intervals to keep
  let keeps = [];
  let cursor = 0;
  for (const f of freezes) {
    keeps.push([cursor, f.start + keepPause]);
    cursor = f.end;
  }
  // Get total duration
  const durationProbe = spawnSync(FFMPEG, [
    '-v', 'quiet', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    '-i', inputMp4
  ], { encoding: 'utf8' });
  const totalDuration = parseFloat((durationProbe.stdout || '162').trim()) || 162;
  keeps.push([cursor, totalDuration]);

  // Build complex filter for segment selection
  // Use the trim + concat approach
  const segments = keeps.filter(([s, e]) => e > s);
  console.log(`  Recortando ${segments.length} segmentos, eliminando ${freezes.reduce((a, f) => a + Math.max(0, f.duration - keepPause), 0).toFixed(1)}s de pausas…`);

  // Build ffmpeg concat via segment files
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
      segOut
    ]);
    segFiles.push(segOut);
  }

  // Concat segments
  const concatList = join(TMP, 'seg_concat.txt');
  writeFileSync(concatList, segFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  ff(['-y', '-f', 'concat', '-safe', '0', '-i', concatList,
      '-c', 'copy', outputMp4]);

  // Cleanup segments
  segFiles.forEach(f => { try { unlinkSync(f); } catch {} });
  console.log(`  ✓ Vídeo principal recortado: ${basename(outputMp4)}`);
  return outputMp4;
}

// ── 3. Concatenate intro + main + outro ──────────────────────────────────────
function concatenate(introParts, mainMp4, outroMp4, outputMp4) {
  console.log('\n🎞️  Concatenando vídeos…');

  // We need all segments at same resolution/fps for copy concat
  // Since intro/outro are silent and main has audio, we normalize:
  //   - All video: 1920×1080, h264, 30fps
  //   - Audio: main keeps its audio; intro/outro get silent AAC track added

  const withAudio = (input, output, silent = false) => {
    if (silent) {
      ff(['-y', '-i', input,
          '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
          '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
          '-shortest', output]);
    } else {
      // Re-encode to ensure consistent params, keep audio
      ff(['-y', '-i', input,
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f0fdf4',
          '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k',
          output]);
    }
  };

  const introAudio = join(TMP, 'intro_audio.mp4');
  const outroAudio = join(TMP, 'outro_audio.mp4');
  const mainNorm   = join(TMP, 'main_norm.mp4');

  console.log('  Normalizando intro…');
  withAudio(introParts, introAudio, true);
  console.log('  Normalizando outro…');
  withAudio(outroMp4, outroAudio, true);
  console.log('  Normalizando main…');
  withAudio(mainMp4, mainNorm, false);

  // Final concat
  const concatList = join(TMP, 'final_concat.txt');
  writeFileSync(concatList, [
    `file '${introAudio.replace(/\\/g, '/')}'`,
    `file '${mainNorm.replace(/\\/g, '/')}'`,
    `file '${outroAudio.replace(/\\/g, '/')}'`,
  ].join('\n'));

  ff(['-y', '-f', 'concat', '-safe', '0', '-i', concatList,
      '-c', 'copy', outputMp4]);

  console.log(`  ✓ Vídeo final: ${basename(outputMp4)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  build-demo-video — Conector ChatGPT con Holded');
  console.log('═══════════════════════════════════════════════════\n');

  const introHtml  = resolve(DOCS, 'intro-chatgpt-holded.html');
  const outroHtml  = resolve(DOCS, 'outro-tutorial.html');
  const mainVideo  = resolve(PUBLIC, 'ChatGPT Apps _ Browse and chat with your favorite apps in ChatGPT - 9 May 2026.mp4');
  const introMp4   = resolve(TMP, 'intro.mp4');
  const outroMp4   = resolve(TMP, 'outro.mp4');
  const mainTrimmed = resolve(TMP, 'main_trimmed.mp4');
  const finalOut   = resolve(PUBLIC, 'holded-chatgpt-demo.mp4');

  // Step 1: Record intro
  await recordHtml({ htmlPath: introHtml, outMp4: introMp4, durationMs: 12000 });

  // Step 2: Record outro
  await recordHtml({ htmlPath: outroHtml, outMp4: outroMp4, durationMs: 6000 });

  // Step 3: Trim main video pauses
  trimPauses(mainVideo, mainTrimmed, 2.5);

  // Step 4: Concatenate
  concatenate(introMp4, mainTrimmed, outroMp4, finalOut);

  console.log('\n✅ Vídeo final guardado en:');
  console.log('   ', finalOut);
  console.log('\nURL en producción (tras deploy):');
  console.log('   https://holded.verifactu.business/conectores/chatgpt/openai-review-demo\n');

  // Cleanup tmp
  try {
    for (const f of readdirSync(TMP)) { try { unlinkSync(join(TMP, f)); } catch {} }
  } catch {}
}

main().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
