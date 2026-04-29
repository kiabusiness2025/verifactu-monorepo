# Video Assets — Intro & Outro

Archivos HTML listos para grabar como vídeo. Abrir en Chrome a pantalla completa y grabar con OBS u otro grabador.

## Archivos

| Archivo      | Duración | Descripción                                                  |
| ------------ | -------- | ------------------------------------------------------------ |
| `intro.html` | ~4.5 s   | Logos Holded + ChatGPT aparecen, se fusionan, aparece título |
| `outro.html` | ~4.0 s   | "Powered by verifactu.business" + Claude Sonnet 4.6          |

## Cómo grabar (OBS · recomendado)

1. Descarga OBS Studio: https://obsproject.com
2. Abre `intro.html` en Chrome → pulsa **F11** (pantalla completa)
3. En OBS: **Sources → + → Window Capture → selecciona Chrome**
4. Resolución: **1920×1080** · FPS: **60**
5. Inicia grabación → espera que termine la animación (~5 s) → detén
6. Repite con `outro.html`
7. En tu editor de vídeo: `intro.mp4` + `demo.mp4` + `outro.mp4`

## Cómo grabar (QuickTime · macOS)

1. Abre `intro.html` en Chrome → F11
2. QuickTime → Archivo → Nueva grabación de pantalla
3. Graba solo la ventana de Chrome

## Cómo grabar (Xbox Game Bar · Windows)

1. Abre `intro.html` en Chrome → F11
2. `Win + G` → Capturar → Grabar (o `Win + Alt + R`)

## Edición final sugerida

```
[intro.mp4] → [Video Holded App 1.mp4] → [outro.mp4]
    4.5 s            tu grabación              4.0 s
```

Herramientas gratuitas para unir:

- **CapCut Desktop** (Windows/Mac) — arrastrar y soltar clips
- **DaVinci Resolve** — profesional y gratuito
- **iMovie** (macOS)

## Subir a YouTube

Cuando tengas el vídeo final (`holded-chatgpt-demo.mp4`):

1. Subir a YouTube como **No listado** (acceso por link)
2. Copiar URL embed: `https://www.youtube.com/embed/XXXXXXXXXXX`
3. Pegarla en:
   `apps/holded/app/conectores/chatgpt/openai-review-demo/page.tsx` → línea `const YOUTUBE_URL = ''`
