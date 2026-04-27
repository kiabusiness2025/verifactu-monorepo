# Holded Demo Video Pipeline

Sistema completo para generar videos de demostración del conector Holded+IA de forma automatizada. Toma datos reales de la API de Holded, genera guiones con Claude, graba las escenas animadas con Playwright y monta el video final con FFmpeg.

---

## Arquitectura del pipeline

```
Holded API (datos reales)
        ↓
holded_client.py — fetch + summarize
        ↓
script_generator.py — Claude genera guiones Q&A por escena
        ↓
html_recorder.py — Playwright graba las 6 escenas HTML animadas
        ↓
sora_generator.py — OpenAI Sora genera fondos intro/outro (opcional)
        ↓
assembler.py — FFmpeg monta y exporta el video final
        ↓
output/final/holded_{connector}_{format}.mp4
```

---

## Prerrequisitos (instalar una sola vez)

```bash
# 1. Dependencias Python
pip install anthropic openai playwright requests python-dotenv

# 2. Navegador Chromium para Playwright
python -m playwright install chromium

# 3. FFmpeg — desde terminal (no requiere admin)
winget install --id Gyan.FFmpeg -e
# Reiniciar terminal tras instalar para que 'ffmpeg' esté en PATH
```

### Variables de entorno requeridas

En `.env.local` en la raíz del monorepo:

```env
# Obligatorio
ANTHROPIC_API_KEY=sk-ant-...

# Una de las dos (se usan indistintamente para OpenAI/Sora)
ISAAK_NEW_OPENAI_API_KEY=sk-...
SORA_API_KEY=sk-...        # Solo si tienes acceso específico a Sora
```

> La API key de Holded está hardcodeada en `config.py` (`HOLDED_API_KEY`) y apunta a la cuenta de demo "Nova Gestión". Cámbiala si quieres datos de otra cuenta.

---

## Uso

### Comando más habitual (producción, Claude, 16:9, sin regenerar scripts)

```bash
cd scripts/video-pipeline
python run.py --connector claude --skip-scripts --skip-sora
```

### Tabla de comandos clave

| Objetivo                                      | Comando                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| Pipeline completo (Claude, 16:9)              | `python run.py --connector claude`                                        |
| Pipeline completo (ChatGPT, 16:9)             | `python run.py --connector chatgpt`                                       |
| Ambos conectores, todos los formatos          | `python run.py --all-connectors --all-formats`                            |
| Solo grabar escenas (rápido, sin IA)          | `python run.py --skip-scripts --skip-sora`                                |
| Solo montar video desde recordings existentes | `python run.py --only-assemble`                                           |
| Refrescar datos de Holded sin grabar nada     | `python run.py --only-data --force-data`                                  |
| Reels/TikTok (9:16)                           | `python run.py --format 9x16 --skip-sora`                                 |
| Instagram square (1:1)                        | `python run.py --format 1x1 --skip-sora`                                  |
| Datos frescos + video nuevo para Reels        | `python run.py --connector claude --format 9x16 --force-data --skip-sora` |

### Flags disponibles

| Flag               | Descripción                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `--connector`      | `claude` (por defecto) o `chatgpt`                               |
| `--format`         | `16x9` (1920×1080) · `9x16` (1080×1920) · `1x1` (1080×1080)      |
| `--skip-sora`      | No genera fondos con Sora (recomendado si no tienes acceso Sora) |
| `--skip-scripts`   | No regenera guiones con Claude API (usa los del último run)      |
| `--skip-record`    | No graba con Playwright (usa recordings existentes)              |
| `--only-assemble`  | Solo ejecuta el paso de FFmpeg (pasos 1-4 ya hechos)             |
| `--only-data`      | Solo refresca el caché de datos de Holded                        |
| `--force-data`     | Fuerza refetch de Holded aunque el caché sea reciente            |
| `--force-sora`     | Regenera fondos Sora aunque ya existan                           |
| `--all-connectors` | Ejecuta para Claude Y ChatGPT en secuencia                       |
| `--all-formats`    | Exporta los 3 formatos (16:9, 9:16, 1:1) en el mismo run         |

---

## Estructura de archivos

```
scripts/video-pipeline/
├── run.py                 # Punto de entrada principal
├── config.py              # Configuración global, claves, escenas, formatos
├── holded_client.py       # Fetch + cache de datos de la API Holded
├── script_generator.py    # Genera guiones Q&A con Claude API
├── sora_generator.py      # Genera fondos cinematográficos con Sora
├── html_recorder.py       # Graba escenas HTML con Playwright → WebM → MP4
├── assembler.py           # Monta el video final con FFmpeg
├── requirements.txt       # Dependencias Python
└── output/                # Generado automáticamente
    ├── data/              # Caché JSON de datos Holded
    ├── scripts/           # Guiones generados por Claude
    ├── backgrounds/       # Videos Sora intro/outro
    ├── recordings/        # WebM/MP4 por conector
    │   ├── claude/
    │   └── chatgpt/
    └── final/             # Videos finales montados
        ├── holded_claude_YouTube_LinkedIn.mp4
        ├── holded_claude_Reels_TikTok.mp4
        ├── holded_claude_Instagram.mp4
        ├── holded_chatgpt_YouTube_LinkedIn.mp4
        └── ...
```

---

## Escenas HTML

Las escenas son archivos HTML autocontenidos en `apps/holded/public/demo/`:

| Archivo                    | Tema                        | Duración |
| -------------------------- | --------------------------- | -------- |
| `scene-1-pyg.html`         | Cuenta de resultados / P&G  | 22s      |
| `scene-2-clientes.html`    | Ranking de clientes         | 22s      |
| `scene-3-facturas.html`    | Facturas pendientes         | 22s      |
| `scene-4-dashboard.html`   | Dashboard ventas mensuales  | 22s      |
| `scene-5-borrador.html`    | Crear borrador de factura   | 24s      |
| `scene-6-comparativa.html` | Comparativa Q1 año anterior | 24s      |

Las escenas 0 (`scene-0-intro`) y 7 (`scene-7-outro`) usan fondo Sora si está disponible.

### Parámetros URL de las escenas

```
?connector=claude     Layout 2 columnas: chat (56%) + panel artefacto blanco (44%)
?connector=chatgpt    Layout 1 columna: chat a ancho completo con tablas enriquecidas
?once=1               Reproduce un ciclo y llama a window.signalDone() al terminar
                      (usado por Playwright para saber cuándo parar la grabación)
```

Ejemplo: `http://localhost:3011/demo/scene-1-pyg.html?connector=claude&once=1`

### Shared utility: pipeline-utils.js

Cargado al final de cada escena HTML. Proporciona:

- **Tema claro:** inyecta CSS con `!important` para convertir el fondo oscuro a `#f5f7fa` (blanco roto) y adaptar todos los colores de texto y superficies.
- **Tema conector:** aplica accent color, texto del badge, label del modelo y avatar según `?connector=`.
- **Once-mode:** expone `window.markSceneDone()` para que las escenas señalen a Playwright cuando termina el ciclo.

---

## Sistema dual-layout (Claude vs ChatGPT)

Cada escena HTML tiene dos modos visuales controlados por `?connector=`:

### `?connector=claude` — 2 columnas

- Columna izquierda (56%): chat de conversación
- Columna derecha (44%): panel de artefacto blanco animado
  - P&G: gráfico de barras horizontales
  - Clientes: filas con barras de progreso degradadas
  - Facturas: lista de estado + grid de aging
  - Dashboard: gráfico de barras verticales
  - Borrador: documento PDF simulado
  - Comparativa: gráfico de barras agrupadas (2024 gris / 2025 naranja)

### `?connector=chatgpt` — 1 columna ancho completo

- Chat a ancho completo con bloques de respuesta enriquecidos:
  - Tablas completas (`.r-table`, `.r-thead`, `.r-tbody-row`) con % / valores
  - Grids de aging (0-30 / 31-60 / 60+ días)
  - Tarjetas de acción (`.r-action-card`) con iconos
  - Bullets de insight (`.r-insight-row`)
  - Resumen MoM con % de crecimiento coloreados

---

## Embed en el Hero de las landings

Las escenas pueden embebirse como iframe en el componente `HoldedHeroVisual` de las landings de cada conector:

- **Landing Claude:** `apps/holded/app/conectores/claude/page.tsx`
- **Landing ChatGPT:** `apps/holded/app/conectores/chatgpt/page.tsx`

El componente `DemoIframeHero` (en `apps/holded/app/components/DemoIframeHero.tsx`) cicla automáticamente por las 6 escenas con `?once=1`, escuchando el evento `markSceneDone` para avanzar a la siguiente. Este enfoque muestra siempre datos animados en vivo, sin pesar nada en el bundle.

Alternativamente, si se ha ejecutado el pipeline, se puede usar un `<video autoPlay loop muted playsInline>` con el MP4 generado en `output/final/`.

---

## Workflow semanal de publicaciones en redes sociales

```bash
# Lunes por la mañana: datos frescos + todos los formatos
cd scripts/video-pipeline
python run.py --all-connectors --all-formats --force-data --skip-sora

# Output (6 videos):
# output/final/holded_claude_YouTube_LinkedIn.mp4
# output/final/holded_claude_Reels_TikTok.mp4
# output/final/holded_claude_Instagram.mp4
# output/final/holded_chatgpt_YouTube_LinkedIn.mp4
# output/final/holded_chatgpt_Reels_TikTok.mp4
# output/final/holded_chatgpt_Instagram.mp4
```

| Red social               | Archivo                  | Duración aprox. |
| ------------------------ | ------------------------ | --------------- |
| YouTube / LinkedIn       | `*_YouTube_LinkedIn.mp4` | ~2:30 min       |
| Instagram Reels / TikTok | `*_Reels_TikTok.mp4`     | ~2:30 min       |
| Instagram cuadrado       | `*_Instagram.mp4`        | ~2:30 min       |

---

## Con Sora (fondos cinematográficos)

Si tienes acceso a la API de Sora (`sora-1.0-hd`):

```bash
python run.py --connector claude --format 16x9
# El pipeline genera intro (8s) y outro (10s) cinematográficos:
# "Fondo blanco estudio, partículas ámbar/coral flotando, bokeh suave, 4K"
```

Los fondos Sora se guardan en `output/backgrounds/` y se reutilizan en runs siguientes (usa `--force-sora` para regenerar). El polling de Sora puede tardar 1-5 minutos por clip.

---

## Datos de Holded

- **Cuenta demo:** "Nova Gestión" — API key en `config.py`
- **Caché:** `output/data/holded_data.json` — se reutiliza entre runs salvo `--force-data`
- **Endpoint base:** `https://api.holded.com/api`
- **Datos que se fetch:** documentos de venta, contactos, P&G contable

Para usar otra cuenta de Holded, cambia `HOLDED_API_KEY` en `config.py`.

---

## Depuración rápida

```bash
# Ver una escena en el navegador
# Abrir: http://localhost:3011/demo/scene-1-pyg.html?connector=claude
# (el servidor de Next.js de apps/holded sirve public/ en ese path)

# Solo grabar una escena concreta (edita html_recorder.py __main__)
python html_recorder.py claude 16x9

# Solo montar desde recordings ya existentes
python run.py --only-assemble --connector claude

# Ver logs detallados: todos los scripts imprimen progreso a stdout
```

---

Actualizado: abril 2026
