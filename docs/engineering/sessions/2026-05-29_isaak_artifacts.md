# Sesión 5 — Isaak Artifacts (2026-05-29)

> **Rama**: `main`
> **Commit**: `c3a81f6c` + fixes gaps posteriores

## Objetivo

Dar a Isaak paridad con Claude en cuanto a artefactos: panel lateral que se abre cuando
el LLM genera un informe, texto streaming token-a-token, y descarga en 4 formatos
(visual, Excel, PDF, Word).

## Contexto previo

- El chat usaba `POST /api/chat` (respuesta JSON, sin streaming)
- Los exports Excel devolvían una URL de texto en el bubble de chat, sin panel visual
- `recharts` y `exceljs` ya estaban instalados; no había `@react-pdf/renderer` ni `docx`

---

## Trabajo realizado

### 1. Tipo central — `app/lib/isaak-artifact.ts`

```typescript
type IsaakArtifact = {
  id: string;
  type: 'visual' | 'excel' | 'pdf' | 'word';
  title: string;
  // Visual
  chartType?: 'bar' | 'line' | 'area' | 'pie';
  chartData?: Array<Record<string, string | number>>;
  chartKeys?: { nameKey: string; valueKeys: string[] };
  tableHeaders?: string[];
  tableRows?: string[][];
  summary?: string;
  // Download
  downloadUrl?: string;
  filename?: string;
  // Cross-format download links (visual artifacts)
  downloadLinks?: { excel?: string; pdf?: string; word?: string };
};
```

Helpers: `makeVisualArtifact()`, `makeDownloadArtifact()`, `isIsaakArtifact()`,
`ARTIFACT_ICON`, `ARTIFACT_LABEL`.

### 2. Generación de datos visuales — `app/lib/isaak-visual-report.ts`

`buildVisualReportData(tenantId, reportType, from, to, title?)` soporta 4 tipos:

| `reportType`        | Chart | Datos                                    |
| ------------------- | ----- | ---------------------------------------- |
| `sales_by_month`    | bar   | Facturas emitidas agrupadas por mes      |
| `expense_breakdown` | pie   | Gastos por proveedor, top-8 + Otros      |
| `cash_flow`         | line  | Ingresos vs gastos por mes               |
| `iva_trimestral`    | bar   | IVA devengado vs soportado por trimestre |

Cada artifact visual incluye `downloadLinks` apuntando a las rutas de export con los
mismos parámetros (`reportType`, `from`, `to`).

### 3. Generación PDF — `app/lib/isaak-pdf-export.tsx` + `/api/isaak/export/pdf`

- `buildPdfReport(input: PdfReportInput): Promise<Buffer>`
- `@react-pdf/renderer` v4: `toBuffer()` devuelve `ReadableStream<Uint8Array>` →
  `streamToBuffer()` acumula chunks
- Componente `PdfDoc`: portada (título, NIF, periodo), tabla con cabecera azul marino
  `#0b2060` y filas alternas, bloque summary, footer "Generado por Isaak"

### 4. Generación Word — `app/lib/isaak-word-export.ts` + `/api/isaak/export/word`

- `buildWordReport(input: WordReportInput): Promise<Buffer>`
- `docx` v9: `Packer.toBuffer(doc)` devuelve `Promise<Buffer>` directamente
- Tabla con primera fila `fill: '0B2060'` + texto blanco; filas alternas sombreadas

### 5. Nuevas LLM tools

```
isaak_generate_visual_report  — devuelve artifact visual (chart + tabla)
isaak_export_pdf              — devuelve artifact de descarga PDF
isaak_export_word             — devuelve artifact de descarga Word
isaak_export_ledger_excel     — actualizado: añade campo artifact al return existente
```

Registradas en `READ_ONLY_NAMES` de `isaak-tools-registry.ts`.

### 6. SSE event:artifact — `app/lib/isaak-chat-stream.ts`

Tras cada tool call, si el JSON del resultado contiene `.artifact`, se emite:

```
event: artifact
data: { ...IsaakArtifact }
```

El evento `done` no cambia; el evento `conversation` se prepende al inicio del stream
para que el cliente pueda tracking el `conversationId` desde el primer chunk.

### 7. Frontend

#### `IsaakArtifactChart.tsx`

Recharts con `ResponsiveContainer height={260}`. Soporta `bar`, `line`, `area`, `pie`.
`fmtNum(v: unknown)` normaliza valores para los `Tooltip formatter`.

#### `IsaakArtifactPanel.tsx`

```
┌─ Header ──────────────────────────────────────────┐
│ 📊 Ventas por mes — Q2 2026              [✕]      │
├───────────────────────────────────────────────────┤
│  [IsaakArtifactChart]                             │
│  [summary block]                                  │
│  [data table]                                     │
│  Descargar como: [📗 Excel] [📄 PDF] [📝 Word]   │
└───────────────────────────────────────────────────┘
```

Para artifacts de descarga (`excel`, `pdf`, `word`): icono grande + botón de descarga.

#### `IsaakChatSection.tsx`

- Migrado de `POST /api/chat` (JSON) a `POST /api/chat/stream` (SSE)
- SSE parser: acumula `buf`, itera líneas, maneja `conversation`, `text-delta`,
  `artifact`, `error` (con `code: 'daily_limit_reached'`), `done`
- Estado `activeArtifact: IsaakArtifact | null` controla el split layout
- Split layout: `flex-row` cuando hay artifact; chat `w-[42%]`, panel `w-[58%]`
- Historial: mensajes con `.artifact` muestran chip `{icon} Ver informe` para
  reabrir el panel en cualquier momento

---

## Decisiones técnicas

| Decisión                                 | Alternativa descartada               | Motivo                                                                                    |
| ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `event: artifact` en SSE antes de `done` | Emitir solo en `done`                | El panel puede abrirse mientras el texto sigue fluyendo                                   |
| `downloadLinks` en el artifact visual    | Pedir nuevo mensaje para descargar   | El usuario no debería tener que pedir otra vez el mismo informe                           |
| Chip "Ver informe" en bubbles pasados    | Solo mostrar el panel al recibir     | Permite recuperar artifacts de mensajes anteriores sin recargar                           |
| `streamToBuffer()` para PDF              | Esperar fix de `@react-pdf/renderer` | v4 cambió API; la comprobación `instanceof ReadableStream` mantiene compatibilidad con v3 |

---

## Ficheros nuevos

```
apps/isaak/app/lib/isaak-artifact.ts
apps/isaak/app/lib/isaak-visual-report.ts
apps/isaak/app/lib/isaak-pdf-export.tsx
apps/isaak/app/lib/isaak-word-export.ts
apps/isaak/app/api/isaak/export/pdf/route.ts
apps/isaak/app/api/isaak/export/word/route.ts
apps/isaak/app/(workspace)/components/IsaakArtifactChart.tsx
apps/isaak/app/(workspace)/components/IsaakArtifactPanel.tsx
```

## Ficheros modificados

```
apps/isaak/app/lib/isaak-ledger-tools.ts      +3 tools + artifact en excel
apps/isaak/app/lib/isaak-tools-registry.ts    +3 names en READ_ONLY_NAMES
apps/isaak/app/lib/isaak-chat-stream.ts       emite event:artifact
apps/isaak/app/api/chat/stream/route.ts       prepend event:conversation
apps/isaak/app/(workspace)/components/IsaakChatSection.tsx  SSE + split + chip
apps/isaak/package.json                       +@react-pdf/renderer +docx
```
