# Video Assets — Guía de Producción

Documentación completa para crear, editar y publicar vídeos del conector ChatGPT+Holded.

---

## Índice

1. [Arquitectura del pipeline](#1-arquitectura-del-pipeline)
2. [Estructura de archivos](#2-estructura-de-archivos)
3. [Comandos rápidos](#3-comandos-rápidos)
4. [Crear una nueva animación HTML](#4-crear-una-nueva-animación-html)
5. [Grabar animaciones con Playwright](#5-grabar-animaciones-con-playwright)
6. [Construir el vídeo completo](#6-construir-el-vídeo-completo)
7. [Generar clips con Sora (IA)](#7-generar-clips-con-sora-ia)
8. [Ajustar el recorte de pausas](#8-ajustar-el-recorte-de-pausas)
9. [Crear vídeos para Instagram Reels (9:16)](#9-crear-vídeos-para-instagram-reels-916)
10. [Añadir audio o música](#10-añadir-audio-o-música)
11. [Publicar en producción](#11-publicar-en-producción)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Arquitectura del pipeline

```
docs/video-assets/
  intro-chatgpt-holded.html   ← animación CSS 12s (Playwright → intro.mp4)
  outro-tutorial.html         ← animación CSS 6s  (Playwright → outro.mp4)

apps/holded/public/video/
  Video Holded App 1.mp4      ← grabación de pantalla original (fuente)
  holded-chatgpt-demo.mp4     ← OUTPUT FINAL (intro + main_trimmed + outro)

scripts/
  build-demo-video.mjs        ← pipeline completo (Playwright + FFmpeg)
```

**Flujo automático:**

```
intro HTML ──Playwright──► intro.mp4 ─────────────────────────────┐
                                                                   ▼
main video ──FFmpeg freezedetect──► main_trimmed.mp4 ──► concat ──► holded-chatgpt-demo.mp4
                                                                   ▲
outro HTML ──Playwright──► outro.mp4 ─────────────────────────────┘
```

**Tecnologías:**

- **Playwright** — graba las animaciones HTML/CSS con Chromium headless y las convierte a mp4 con logos reales
- **FFmpeg** — detecta y elimina pausas, normaliza codec/resolución, concatena segmentos
- **Sora API** (opcional) — genera clips de vídeo IA para usar en lugar de (o junto a) las animaciones CSS

---

## 2. Estructura de archivos

| Archivo                         | Tipo          | Duración | Uso                                           |
| ------------------------------- | ------------- | -------- | --------------------------------------------- |
| `intro-chatgpt-holded.html`     | CSS animation | 12s      | Intro principal — 6 escenas premium 1920×1080 |
| `intro-minimal.html`            | CSS animation | 5.5s     | Intro corta — 2 cards + connector             |
| `outro-tutorial.html`           | CSS animation | 6s       | Outro tutorial — "Gracias por ver"            |
| `outro-verifactu-business.html` | CSS animation | 8s       | Outro corporativo — fade-to-white             |
| `reels-intro.html`              | CSS animation | 12s      | Intro vertical 9:16 para Instagram Reels      |
| `intro-sora.mp4`                | Sora output   | 10s      | Generado por `generate-intro-sora.mjs`        |

**Logos disponibles:**

```
docs/OpenAI logos/
  Chatgpt icono 2.png          ← icono recomendado para vídeos (cuadrado)
  ChatGPT logotipo.png         ← con texto (para slides de texto)
  ChatGPT icono.png            ← variante

docs/Holded logos/
  holded-diamond-logo.png      ← icono recomendado (diamante rojo)
  Holded_Logotipo_Dark.png     ← logotipo completo oscuro
  Holded_Logotipo_Light.png    ← logotipo completo claro
```

---

## 3. Comandos rápidos

```bash
# Pipeline completo: intro + main (sin pausas) + outro → holded-chatgpt-demo.mp4
pnpm video:build-demo

# Generar clips con Sora IA
pnpm video:intro            # intro 10s horizontal (Sora)
pnpm video:intro:minimal    # intro 4s minimalista (Sora)
pnpm video:reels            # intro 10s vertical 9:16 (Sora)
pnpm video:outro            # outro 8s corporativo (Sora)
pnpm video:outro:tutorial   # outro 4s tutorial (Sora)

# Deploy a producción
pnpm deploy:vercel
```

---

## 4. Crear una nueva animación HTML

### Plantilla base

Copia `outro-tutorial.html` como punto de partida (es la más limpia):

```bash
cp docs/video-assets/outro-tutorial.html docs/video-assets/mi-nueva-animacion.html
```

### Dimensiones obligatorias

| Formato                  | Resolución  | Uso                |
| ------------------------ | ----------- | ------------------ |
| YouTube/web horizontal   | `1920×1080` | intro, outro, demo |
| Instagram Reels vertical | `1080×1920` | reels, stories     |

El `<html>` y `<body>` deben tener dimensión fija (no viewport):

```html
html, body { width: 1920px; height: 1080px; /* o 1080px/1920px para Reels */ overflow: hidden; }
```

### Incluir logos reales

Rutas relativas desde `docs/video-assets/` hacia `docs/`:

```html
<!-- ChatGPT (icono cuadrado, recomendado) -->
<img src="../OpenAI logos/Chatgpt icono 2.png" alt="ChatGPT" />

<!-- Holded (diamante, recomendado) -->
<img src="../Holded logos/holded-diamond-logo.png" alt="Holded" />
```

CSS para que encajen en una card cuadrada:

```css
.logo-card img {
  width: 88%;
  height: 88%;
  object-fit: contain;
}
```

### Paleta de colores del proyecto

```css
:root {
  --green: #10a37f; /* ChatGPT green — acento principal */
  --green-lt: #34d399; /* verde claro para gradientes */
  --green-bg: #d1fae5; /* fondo verde muy suave */
  --navy: #0c1c50; /* azul marino para titulares */
  --red: #e53935; /* rojo Holded (usar con moderación) */
}
```

Gradiente de fondo estándar:

```css
background: linear-gradient(140deg, #ecfdf5 0%, #f0fdf4 40%, #f0f9ff 75%, #f9fafb 100%);
```

### Glassmorphism (estilo tarjetas)

```css
.card {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(16, 163, 127, 0.12);
}
```

### Patrón de animación recomendado

Todas las animaciones entran con `opacity: 0` y se animan via `@keyframes`. Usa `animation-fill-mode: forwards` (nunca `both` en producción — puede causar flickering en Playwright):

```css
.element {
  opacity: 0;
  animation: fade-up 0.7s ease 1.5s forwards; /* delay en segundos */
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Escenas secuenciales (como en intro-chatgpt-holded.html)

Para múltiples escenas en una sola animación, usa `animation-delay` acumulado y `opacity: 0` → `opacity: 1` → `opacity: 0` para cada bloque:

```css
/* Escena aparece en t=2s y desaparece en t=5s */
.scene-2 {
  animation:
    scene-in 0.6s ease 2s forwards,
    scene-out 0.5s ease 5s forwards;
}
@keyframes scene-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes scene-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

### Probar en el navegador

```bash
# Abre en Chrome directamente (doble clic en Windows Explorer)
# O desde consola:
start docs/video-assets/mi-nueva-animacion.html
```

Verifica que la animación dura exactamente lo esperado y que los logos cargan.

---

## 5. Grabar animaciones con Playwright

Playwright graba el HTML con Chromium headless y convierte el webm a mp4 con FFmpeg.

### Añadir al pipeline existente

En `scripts/build-demo-video.mjs`, la función `recordHtml()` acepta:

```js
await recordHtml({
  htmlPath: resolve(DOCS, 'mi-nueva-animacion.html'),
  outMp4: resolve(TMP, 'mi-clip.mp4'),
  durationMs: 8000, // duración en milisegundos (+ 500ms de buffer automático)
  width: 1920, // opcional, default 1920
  height: 1080, // opcional, default 1080
});
```

Para Reels (vertical):

```js
await recordHtml({
  htmlPath: resolve(DOCS, 'reels-intro.html'),
  outMp4: resolve(TMP, 'reels.mp4'),
  durationMs: 12000,
  width: 1080,
  height: 1920,
});
```

### Grabar de forma standalone (sin el pipeline completo)

```js
// scripts/grabar-clip.mjs
import { chromium } from 'playwright';
import { spawnSync, mkdirSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: ROOT + '/.tmp-video', size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
await page.goto('file:///' + ROOT.replace(/\\/g, '/') + '/docs/video-assets/outro-tutorial.html');
await page.waitForTimeout(6500); // duración + 500ms buffer
const webm = await page.video().path();
await context.close();
await browser.close();
console.log('Webm guardado en:', webm);
// Convierte con FFmpeg manualmente si hace falta
```

---

## 6. Construir el vídeo completo

### Comando

```bash
pnpm video:build-demo
# o directamente:
node scripts/build-demo-video.mjs
```

### Qué hace el script

1. **Graba intro** (`intro-chatgpt-holded.html`, 12s) → `.tmp-video/intro.mp4`
2. **Graba outro** (`outro-tutorial.html`, 6s) → `.tmp-video/outro.mp4`
3. **Detecta pausas** en `Video Holded App 1.mp4` con FFmpeg `freezedetect`
4. **Recorta** cada pausa ≥2.5s, dejando 0.8s al inicio para naturalidad
5. **Normaliza** intro + main + outro al mismo codec/resolución/audio
6. **Concatena** y guarda en `apps/holded/public/video/holded-chatgpt-demo.mp4`

### Cambiar el vídeo de demostración fuente

Edita la constante en `scripts/build-demo-video.mjs`:

```js
const mainVideo = resolve(PUBLIC, 'Video Holded App 1.mp4');
// Cambia a:
const mainVideo = resolve(PUBLIC, 'mi-nueva-grabacion.mp4');
```

### Cambiar intro u outro

```js
// Líneas ~265-270 en build-demo-video.mjs
const introHtml = resolve(DOCS, 'intro-chatgpt-holded.html'); // ← cambia aquí
const outroHtml = resolve(DOCS, 'outro-tutorial.html'); // ← o aquí
const introMp4 = resolve(TMP, 'intro.mp4');
const outroMp4 = resolve(TMP, 'outro.mp4');
```

---

## 7. Generar clips con Sora (IA)

### Requisito

Añade `OPENAI_API_KEY` a `.env.local` en la raíz del monorepo:

```env
OPENAI_API_KEY=sk-...
```

### Scripts disponibles

| Script                      | Salida                                      | Dimensiones | Duración |
| --------------------------- | ------------------------------------------- | ----------- | -------- |
| `pnpm video:intro`          | `docs/video-assets/intro-sora.mp4`          | 1280×720    | 10s      |
| `pnpm video:intro:minimal`  | `docs/video-assets/intro-minimal-sora.mp4`  | 1280×720    | 4s       |
| `pnpm video:reels`          | `docs/video-assets/reels-intro-sora.mp4`    | 720×1280    | 10s      |
| `pnpm video:outro`          | `docs/video-assets/outro-sora.mp4`          | 1280×720    | 8s       |
| `pnpm video:outro:tutorial` | `docs/video-assets/outro-tutorial-sora.mp4` | 1280×720    | 4s       |

### Crear un nuevo script Sora

Copia `scripts/generate-intro-sora.mjs` y modifica:

```js
const response = await openai.videos.generate({
  model: 'sora-2',
  prompt: `Tu descripción visual en inglés.
           No incluyas texto en pantalla — será añadido en post-producción.
           Paleta: mint white (#f0fdf4), mint green (#10a37f), white glassmorphism cards.`,
  size: '1280x720', // o '720x1280' para vertical
  duration: '8', // '4' | '8' | '10' | '12'
  n: 1,
});
```

**Limitaciones de Sora:**

- No renderiza texto en español con fiabilidad. Añade todos los textos en post-producción con CapCut o DaVinci Resolve.
- La generación tarda 2-10 minutos por clip.
- Los clips generados tienen variación aleatoria — guarda las versiones que te gusten.

### Textos a añadir en post-producción

**Intro (escenas 3-6 del prompt):**

- Chat bubble usuario: `¿Cuál ha sido la facturación de este mes?`
- Respuesta IA: `Tu facturación ha aumentado un 15% respecto al mes anterior.`
- Feature cards: `Facturas · Clientes · Ingresos · Gastos · Informes · Proyectos`
- Hero final: `Conector ChatGPT con Holded`
- CTA: `holded.verifactu.business/conectores/chatgpt`

---

## 8. Ajustar el recorte de pausas

En `scripts/build-demo-video.mjs`:

```js
// Umbral mínimo: pausas más largas que este valor se recortan
trimPauses(mainVideo, mainTrimmed, 2.5); // ← segundos (default: 2.5)
```

```js
// Dentro de trimPauses(), cuánto dejar al inicio de cada pausa:
const keepPause = 0.8; // segundos (0 = corte limpio, 1.5 = más natural)
```

**Guía:**

- `freezeThresholdSec: 1.5` — agresivo, elimina incluso pausas cortas entre frases
- `freezeThresholdSec: 2.5` — equilibrado (default)
- `freezeThresholdSec: 4.0` — conservador, solo elimina pausas muy largas
- `keepPause: 0` — corte instantáneo (puede parecer brusco)
- `keepPause: 0.8` — deja un momento de pausa natural (recomendado)

---

## 9. Crear vídeos para Instagram Reels (9:16)

El archivo `docs/video-assets/reels-intro.html` ya está adaptado a 1080×1920.

Para construir un Reel completo (intro vertical + grabación vertical + outro vertical):

1. Graba la demo en vertical (1080×1920) con tu móvil o con un crop de la grabación de escritorio
2. Añade un nuevo paso en `build-demo-video.mjs`:

```js
// Grabar intro vertical
const reelsIntroMp4 = resolve(TMP, 'reels-intro.mp4');
await recordHtml({
  htmlPath: resolve(DOCS, 'reels-intro.html'),
  outMp4: reelsIntroMp4,
  durationMs: 12000,
  width: 1080,
  height: 1920,
});

// Output Reels
const reelsFinalOut = resolve(PUBLIC, 'holded-chatgpt-reels.mp4');
concatenate(reelsIntroMp4, mainVideoVertical, reelsOutroMp4, reelsFinalOut);
```

3. Sirve el archivo desde `/video/holded-chatgpt-reels.mp4`

---

## 10. Añadir audio o música

Los clips HTML grabados con Playwright son **silenciosos** por diseño.

### Añadir música de fondo al intro

En la función `recordHtml()` de `build-demo-video.mjs`, reemplaza la conversión webm→mp4:

```js
// Con música (reemplaza el bloque ff([...]) en recordHtml):
ff([
  '-y',
  '-i',
  videoPath,
  '-i',
  resolve(ROOT, 'docs', 'audio', 'background-music.mp3'),
  '-vf',
  `scale=${width}:${height}:...`,
  '-r',
  '30',
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '20',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  '-shortest', // corta cuando termine el vídeo (no la música)
  outMp4,
]);
```

### Mezclar música + audio original del vídeo principal

```js
// En concatenate(), al normalizar mainMp4:
ff([
  '-y',
  '-i',
  input,
  '-i',
  resolve(ROOT, 'docs', 'audio', 'background-music.mp3'),
  '-filter_complex',
  '[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.3[aout]',
  '-map',
  '0:v',
  '-map',
  '[aout]',
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '20',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  output,
]);
```

El `weights=1 0.3` mantiene el audio original al 100% y la música al 30%.

### Fuentes de música libre de derechos

- [Pixabay Music](https://pixabay.com/music/) — sin atribución, gratis
- [YouTube Audio Library](https://studio.youtube.com/channel/UC/music) — para vídeos de YouTube

---

## 11. Publicar en producción

### Pipeline completo de publicación

```bash
# 1. Construir el vídeo
pnpm video:build-demo

# 2. Verificar que el archivo existe y tiene buen tamaño
ls -lh apps/holded/public/video/holded-chatgpt-demo.mp4

# 3. Desplegar a Vercel (el vídeo se sirve como static asset)
pnpm deploy:vercel
```

El vídeo queda disponible en:
`https://holded.verifactu.business/video/holded-chatgpt-demo.mp4`

Y se muestra en:
`https://holded.verifactu.business/conectores/chatgpt/openai-review-demo`

### Cambiar a YouTube embed (mejor para vídeos grandes)

1. Sube el mp4 a YouTube como **No listado**
2. Copia la URL embed: `https://www.youtube.com/embed/VIDEO_ID`
3. Edita `apps/holded/app/conectores/chatgpt/openai-review-demo/page.tsx`:

```tsx
const YOUTUBE_URL = 'https://www.youtube.com/embed/VIDEO_ID';
```

4. Despliega: `pnpm deploy:vercel`

### Crear una nueva página de demo

Copia la estructura de `apps/holded/app/conectores/chatgpt/openai-review-demo/`:

```
apps/holded/app/conectores/[nombre-conector]/demo/
  page.tsx   ← copia y edita la constante YOUTUBE_URL y los textos
```

---

## 12. Troubleshooting

### FFmpeg no encontrado

```bash
# Instalar con winget
winget install Gyan.FFmpeg

# El script build-demo-video.mjs lo busca automáticamente en:
# C:\Users\[usuario]\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\
# Si falla, edita la función findFFmpeg() y añade la ruta exacta
```

### Playwright / Chromium no encontrado

```bash
# Instalar Playwright y descargar Chromium
pnpm add -Dw playwright
npx playwright install chromium

# Verificar ruta del ejecutable
node -e "const {chromium}=require('playwright'); console.log(chromium.executablePath())"
```

### El vídeo generado está en negro

La animación CSS puede no haber terminado de cargar antes de que Playwright empiece a grabar. Aumenta el delay inicial:

```js
// En recordHtml(), antes de waitForTimeout:
await page.waitForLoadState('networkidle'); // espera que carguen las imágenes
await page.waitForTimeout(durationMs + 500);
```

### Los logos no aparecen en el vídeo

Las rutas `src="../OpenAI logos/..."` son relativas. Playwright usa URLs `file:///`, que respetan las rutas relativas. Si el logo no carga:

1. Verifica que el archivo existe: `ls "docs/OpenAI logos/Chatgpt icono 2.png"`
2. Verifica que la ruta en el HTML es exacta (mayúsculas/minúsculas importan)
3. Abre el HTML en Chrome manualmente para confirmar que los logos se ven

### La concatenación falla por codecs incompatibles

El paso de normalización en `concatenate()` re-encoda todo a `libx264 + aac`. Si aun así falla:

```bash
# Inspecciona el codec del vídeo problemático
ffprobe -v quiet -show_streams -select_streams v:0 tu-video.mp4
```

Y ajusta el filtro de escala/fps en `withAudio()` para que coincida.

### El recorte de pausas elimina demasiado contenido

Revisa qué pausas detectó en la salida del script:

```
Encontradas 12 pausa(s):
  0.0s → 5.1s (5.1s)
  ...
```

Aumenta el umbral (`2.5` → `4.0`) o aumenta `keepPause` (`0.8` → `1.5`).

---

## Flujo recomendado para un vídeo nuevo

```
1. Graba la demo de pantalla  →  guárdala en apps/holded/public/video/
2. Crea o reutiliza el HTML de intro/outro  →  docs/video-assets/
3. Edita build-demo-video.mjs  →  apunta a los nuevos archivos
4. pnpm video:build-demo  →  genera holded-chatgpt-demo.mp4 (o renómbralo)
5. pnpm deploy:vercel  →  en producción en ~3 minutos
```
