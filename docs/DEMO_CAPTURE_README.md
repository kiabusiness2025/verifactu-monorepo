# Demo Mockups Capture Guide

Esta guía describe cómo generar capturas reales del `/demo` (PNG) y assets animados (GIF/MP4) para el Hero de landing.

## Requisitos

- Node 20+
- `pnpm`
- `playwright` en el workspace
- `ffmpeg` (opcional, solo para GIF/MP4)

Si no tienes Playwright:

```bash
pnpm add -Dw playwright
pnpm exec playwright install chromium
```

## Scripts disponibles

En raíz del monorepo:

```bash
pnpm run capture:demo:mockups
pnpm run capture:demo:hero
```

Opciones:

```bash
pnpm run capture:demo:mockups -- --base-url http://127.0.0.1:3000
pnpm run capture:demo:mockups -- --out-dir apps/landing/public/assets/hero/generated
pnpm run capture:demo:mockups -- --no-video
pnpm run capture:demo:hero -- --base-url http://127.0.0.1:3000
```

## Flujo recomendado

1. Levantar la app de demo:

```bash
pnpm -C apps/app dev
```

2. Generar capturas y vídeo:

```bash
pnpm run capture:demo:mockups -- --base-url http://127.0.0.1:3000
```

3. Reemplazar assets del Hero automáticamente:

```bash
pnpm run capture:demo:hero -- --base-url http://127.0.0.1:3000
```

Esto hace:

- Genera PNG en `apps/landing/public/assets/hero/generated`
- Genera `demo-hero.gif` y `demo-hero.mp4` (si hay `ffmpeg`)
- Copia `demo-overview.png`, `demo-invoices.png`, `demo-isaak.png` a `apps/landing/public/assets/hero`
- Actualiza `apps/landing/app/lib/home/ui.tsx` para usar `.png` en el Hero

## Docker (preinstalado)

`Dockerfile.dev` ahora incluye:

- `ffmpeg`
- `chromium`
- librerías necesarias para browser headless

Build y run:

```bash
docker build -f Dockerfile.dev -t verifactu-dev .
docker run --rm -it -p 3000:3000 -p 3001:3001 verifactu-dev
```

## Troubleshooting

### Error: "Playwright is not installed"

```bash
pnpm add -Dw playwright
```

### Error al lanzar browser de Playwright

El script intenta fallback automático a Chromium del sistema (`/usr/bin/chromium`).

### No se genera GIF/MP4

Verifica `ffmpeg`:

```bash
ffmpeg -version
```

