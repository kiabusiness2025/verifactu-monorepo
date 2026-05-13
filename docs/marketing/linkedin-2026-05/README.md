# Mocks LinkedIn — Holded × Claude vs ChatGPT

3 mocks HTML listos para exportar a PNG y subir a LinkedIn.

## Archivos

| Archivo                       | Tamaño    | Uso recomendado                                                            |
| ----------------------------- | --------- | -------------------------------------------------------------------------- |
| `mock1-hero-comparativa.html` | 1200×627  | **Post LinkedIn horizontal** — anuncio principal de la demo                |
| `mock2-hallazgos.html`        | 1080×1080 | **Post LinkedIn cuadrado** — los 6 hallazgos de Claude para feed           |
| `mock3-bugs-fixed.html`       | 1200×627  | **Post LinkedIn horizontal** — historia del sprint (7 bugs fixed en 1 día) |

## Cómo exportar a PNG

### Opción 1 — Captura manual (más rápido)

1. Abre el `.html` en Chrome o Edge
2. F12 → Device Toolbar (Ctrl+Shift+M)
3. Selecciona "Responsive", pon el tamaño exacto (1200×627 o 1080×1080)
4. Click derecho en la página → "Capture screenshot" o usa la extensión [Awesome Screenshot](https://www.awesomescreenshot.com/)
5. Recorta el `.card` (sin el fondo gris)

### Opción 2 — Puppeteer (automatizado)

Si tienes Node + puppeteer instalados:

```bash
npx puppeteer-cli screenshot mock1-hero-comparativa.html mock1.png --viewport-width=1280 --viewport-height=720
npx puppeteer-cli screenshot mock2-hallazgos.html mock2.png --viewport-width=1160 --viewport-height=1160
npx puppeteer-cli screenshot mock3-bugs-fixed.html mock3.png --viewport-width=1280 --viewport-height=720
```

### Opción 3 — Servicio online

Sube el HTML a https://htmlcsstoimage.com/ o https://urlbox.io/ — generan PNG a la primera.

## Copys sugeridos para LinkedIn

### Post 1 — Hero comparativa

```
Las mismas 5 preguntas a tu contabilidad de Holded, lanzadas a ChatGPT y a Claude.

Esto es lo que cambió:
⏱ Claude responde en 4:46, ChatGPT en 9:40
💰 El IVA Q1 2026 lo calculan idéntico al céntimo
📊 El Excel de facturas 2025 sale con los mismos 33.099 €
🎯 Cada uno detectó cosas únicas que el otro no vio

Si tienes Holded y quieres preguntarle cosas en español natural sin abrir Holded, el conector está en Verifactu.

→ chatgpt.verifactu.business
→ claude.verifactu.business

Activación en 30 segundos. Gratis.

#Holded #ChatGPT #Claude #Contabilidad #VeriFactu
```

### Post 2 — Hallazgos

```
En 4 minutos y 46 segundos, Claude me detectó 6 problemas reales en mi contabilidad de Holded.

Ningún gestor humano me los había marcado.

1. 28 cuentas bancarias VF Smoke a saldo 0
2. IVA de compras a medio contabilizar
3. Falta retención IRPF 15% en asesoría
4. Numeración de facturas inconsistente entre ejercicios (rompe VeriFactu)
5. Iota Construcción = 28% facturación → riesgo de concentración
6. costPrice = 0 en todos los productos → margen unitario imposible

Bonus: cuando le hice la misma pregunta a ChatGPT, encontró un descuadre contable de 68.398 €.

¿Qué AI prefieres para tu contabilidad?

#Contabilidad #AI #Holded #Verifactu
```

### Post 3 — Sprint cerrado

```
Día de sprint:

★ Grabamos demo del conector Holded
★ Demo detecta 7 bugs reales del MCP server
★ Los arreglamos uno a uno
★ 70 tests verde, TypeScript limpio
★ 3 deploys a producción
★ Smoke tests en vivo contra el deploy
★ Cero downtime

El conector queda listo a 200% — submission review para Anthropic y OpenAI.

Si construyes integraciones contables con AI, el bug que más me sorprendió fue éste:

los modelos LLM (Claude Opus 4.7 y GPT-4) envían `null` por defecto a campos opcionales que no quieren rellenar. Si tu schema Zod no acepta `null`, el modelo entra en bucle 8 reintentos antes de descubrir el workaround.

Fix: usar `.nullish().transform()` en Zod. 9 tests de regresión. PR mergeado el mismo día.

#TypeScript #MCP #AI #DevOps
```

## Notas

- **Colores branding Verifactu:** azul corporativo `#2361d8`, azul oscuro `#081936`, amarillo acento `#f7c948`.
- **Font:** stack nativo del SO (`-apple-system, Segoe UI`) — se ven natural en cualquier captura.
- **Sin imágenes externas:** todo CSS puro, evita problemas de CORS al capturar.
- **Texto editable:** abre el `.html` en cualquier editor para cambiar cifras o copy antes de capturar.
