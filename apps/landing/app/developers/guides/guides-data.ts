// Catálogo de guías paso a paso del Developers portal.
// Cada guía es contenido estático servido por /developers/guides/[slug].
//
// IMPORTANTE: las guías solo documentan funcionalidad YA disponible en
// producción. Nada de "tools nuevas" ni cambios de URL en MCP connectors
// hasta que termine la revisión OpenAI/Anthropic.

import type { LucideIcon } from 'lucide-react';
import { Bot, FileText, Plug, Webhook } from 'lucide-react';

export type GuideStep = {
  /** Título corto del paso (aparece en el sidebar de ToC). */
  title: string;
  /** Descripción del paso. Acepta JSX inline vía dangerouslySetInnerHTML NO — solo strings. */
  body: string;
  /** Bloques de código opcionales. */
  code?: Array<{
    language: 'bash' | 'js' | 'ts' | 'python' | 'json' | 'http';
    label?: string;
    content: string;
  }>;
  /** Callout opcional para advertencias o tips. */
  callout?: {
    kind: 'info' | 'warn' | 'success';
    text: string;
  };
};

export type Guide = {
  slug: string;
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  /** Resumen de 1-2 frases para el índice y meta description. */
  summary: string;
  /** Estimación de lectura (minutos). */
  readingMinutes: number;
  /** Prerrequisitos en lenguaje plano. */
  prerequisites: string[];
  /** Pasos en orden. */
  steps: GuideStep[];
  /** Enlaces "qué hago ahora" — referencias dentro del portal. */
  nextSteps: Array<{ label: string; href: string }>;
};

// ─── Guías ─────────────────────────────────────────────────────────────────────

const PRIMERA_FACTURA: Guide = {
  slug: 'primera-factura',
  title: 'Tu primera factura vía API en 5 minutos',
  eyebrow: 'Quickstart',
  icon: FileText,
  summary:
    'Crea, valida y emite una factura a VeriFactu desde cURL. Sin instalar nada, solo tu API key.',
  readingMinutes: 5,
  prerequisites: [
    'Cuenta gratuita en isaak.verifactu.business',
    'Certificado VeriFactu subido (necesario para emitir a AEAT)',
    'Una API key de prueba (isk_test_…) o de producción (isk_live_…)',
  ],
  steps: [
    {
      title: '1. Obtén tu API key',
      body: 'Ve a Ajustes → API keys y genera una key. La key de test (isk_test_…) usa el sandbox de AEAT (Pre-Producción) y no genera asientos contables reales.',
      callout: {
        kind: 'info',
        text: 'Guarda la key en una variable de entorno. NUNCA la commitees al repo ni la pegues en un cliente JavaScript del navegador.',
      },
      code: [
        {
          language: 'bash',
          label: 'Variable de entorno',
          content: 'export ISAAK_API_KEY="isk_test_xxxxxxxxxxxxxxxx"',
        },
      ],
    },
    {
      title: '2. Verifica la autenticación',
      body: 'La primera llamada debería devolver los datos fiscales de tu empresa. Si recibes 401, revisa que el header Authorization tenga el formato exacto "Bearer <key>".',
      code: [
        {
          language: 'bash',
          label: 'GET /api/v1/companies/current',
          content: `curl https://isaak.verifactu.business/api/v1/companies/current \\
  -H "Authorization: Bearer $ISAAK_API_KEY"`,
        },
        {
          language: 'json',
          label: 'Respuesta',
          content: `{
  "ok": true,
  "data": {
    "id": "tnt_xxx",
    "name": "Acme SL",
    "nif": "B12345678",
    "verifactuEnabled": true
  },
  "meta": { "requestId": "req_...", "timestamp": "2026-05-28T10:00:00.000Z" }
}`,
        },
      ],
    },
    {
      title: '3. Crea un borrador',
      body: 'El POST devuelve la factura en estado draft. Todavía NO está en AEAT — solo está guardada en Isaak. Aprovecha para revisar líneas, NIF del cliente y totales antes de emitir.',
      code: [
        {
          language: 'bash',
          label: 'POST /api/v1/invoices',
          content: `curl -X POST https://isaak.verifactu.business/api/v1/invoices \\
  -H "Authorization: Bearer $ISAAK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientName": "Cliente Demo SL",
    "clientNif": "B87654321",
    "lines": [
      { "description": "Consultoría mayo 2026", "quantity": 1, "unitPrice": 1000.00, "vatRate": 21 }
    ]
  }'`,
        },
      ],
      callout: {
        kind: 'success',
        text: 'La respuesta incluye el id de la factura (inv_…) y el confirmationToken que necesitarás en el paso 4.',
      },
    },
    {
      title: '4. Emite a AEAT (irreversible)',
      body: 'Las emisiones a VeriFactu son inmutables. Por eso el endpoint /issue exige un confirmationToken: lo devuelve el preview anterior y caduca a los 5 minutos. Sin él recibes 400 missing_confirmation.',
      code: [
        {
          language: 'bash',
          label: 'POST /api/v1/invoices/:id/issue',
          content: `curl -X POST https://isaak.verifactu.business/api/v1/invoices/inv_xxx/issue \\
  -H "Authorization: Bearer $ISAAK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "confirmationToken": "tkn_xxx_del_paso_previo" }'`,
        },
      ],
      callout: {
        kind: 'warn',
        text: 'En isk_test_…, la respuesta es idéntica a producción pero NO se registra en AEAT real. Usa isk_test antes de mover código a prod.',
      },
    },
    {
      title: '5. Descarga el PDF firmado',
      body: 'Una vez emitida, el PDF incluye el QR con el hash VeriFactu y el código seguro. Se sirve como application/pdf desde el endpoint /pdf.',
      code: [
        {
          language: 'bash',
          label: 'GET /api/v1/invoices/:id/pdf',
          content: `curl https://isaak.verifactu.business/api/v1/invoices/inv_xxx/pdf \\
  -H "Authorization: Bearer $ISAAK_API_KEY" \\
  -o factura.pdf`,
        },
      ],
    },
  ],
  nextSteps: [
    { label: 'Manejar errores y reintentos', href: '/developers/errors' },
    { label: 'Recibir el evento invoice.issued vía webhook', href: '/developers/guides/webhooks-hmac' },
    { label: 'Referencia interactiva completa', href: '/developers/api' },
  ],
};

const WEBHOOKS_HMAC: Guide = {
  slug: 'webhooks-hmac',
  title: 'Recibir webhooks con firma HMAC verificada',
  eyebrow: 'Webhooks',
  icon: Webhook,
  summary:
    'Recibe eventos en tiempo real (invoice.issued, certificate.expiring…) y verifica la firma HMAC-SHA256 con código de ejemplo en Node, Python y Go.',
  readingMinutes: 7,
  prerequisites: [
    'Endpoint HTTPS público que pueda recibir POSTs (ngrok sirve para pruebas locales)',
    'Plan Pro o Business con webhooks activos',
    'Acceso a Ajustes → Webhooks en isaak.verifactu.business para registrar la URL',
  ],
  steps: [
    {
      title: '1. Registra tu endpoint',
      body: 'En el panel de Isaak, sección Webhooks, pulsa "Añadir endpoint". Introduce tu URL HTTPS y selecciona los eventos que quieras recibir. Isaak te dará un signing secret (whsec_…) que necesitarás en el paso 3.',
      callout: {
        kind: 'info',
        text: 'El signing secret se muestra UNA SOLA VEZ tras crearlo. Guárdalo en tu gestor de secretos antes de cerrar la ventana.',
      },
    },
    {
      title: '2. Acepta el POST',
      body: 'Tu endpoint recibe un POST application/json con el evento. Devuelve 2xx en menos de 5 segundos. Si tardas más o devuelves >= 400, Isaak reintenta con backoff exponencial (1m, 5m, 30m, 2h, 12h, 24h) hasta 6 veces.',
      code: [
        {
          language: 'json',
          label: 'Body del POST',
          content: `{
  "id": "evt_2026_05_28_abc123",
  "type": "invoice.issued",
  "createdAt": "2026-05-28T10:23:45.000Z",
  "tenantId": "tnt_xxx",
  "data": {
    "invoiceId": "inv_2026_0042",
    "number": "2026/0042",
    "amount": 1210.00,
    "verifactuHash": "a1b2c3d4..."
  }
}`,
        },
      ],
    },
    {
      title: '3. Verifica la firma',
      body: 'Cada POST trae las cabeceras x-isaak-signature y x-isaak-timestamp. Calcula HMAC-SHA256 sobre "<timestamp>.<raw_body>" con tu signing secret y compara con timingSafeEqual. Si el timestamp tiene más de 5 minutos, rechaza el evento (anti-replay).',
      code: [
        {
          language: 'js',
          label: 'Node.js (Express)',
          content: `import crypto from 'node:crypto';
import express from 'express';

const app = express();
const SECRET = process.env.ISAAK_WEBHOOK_SECRET;

// IMPORTANTE: necesitas el cuerpo crudo (Buffer), NO el JSON parseado
app.post('/webhooks/isaak',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.header('x-isaak-signature');
    const ts = req.header('x-isaak-timestamp');

    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
      return res.status(400).send('timestamp out of window');
    }

    const payload = \`\${ts}.\${req.body.toString('utf8')}\`;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).send('invalid signature');
    }

    const event = JSON.parse(req.body.toString('utf8'));
    console.log('event', event.type, event.id);
    res.status(200).send('ok');
  }
);`,
        },
        {
          language: 'python',
          label: 'Python (Flask)',
          content: `import hmac, hashlib, os, time, json
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ['ISAAK_WEBHOOK_SECRET'].encode()

@app.post('/webhooks/isaak')
def isaak_webhook():
    sig = request.headers.get('X-Isaak-Signature', '')
    ts = request.headers.get('X-Isaak-Timestamp', '0')

    if abs(time.time() - float(ts)) > 300:
        abort(400, 'timestamp out of window')

    payload = f"{ts}.{request.get_data(as_text=True)}".encode()
    expected = hmac.new(SECRET, payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(sig, expected):
        abort(401, 'invalid signature')

    event = request.get_json()
    print('event', event['type'], event['id'])
    return ('', 200)`,
        },
      ],
      callout: {
        kind: 'warn',
        text: 'NO uses comparación de strings (==): es vulnerable a timing attacks. Usa crypto.timingSafeEqual (Node) o hmac.compare_digest (Python).',
      },
    },
    {
      title: '4. Hazlo idempotente',
      body: 'Isaak puede reintentar un evento ya entregado (ej. si tu servidor no respondió a tiempo). Usa el campo id del evento como clave de idempotencia: guárdalo en BBDD con UNIQUE constraint y descarta duplicados con 200 OK.',
      code: [
        {
          language: 'js',
          label: 'Tabla de idempotencia (Postgres + Prisma)',
          content: `model ProcessedWebhook {
  id        String   @id  // evt_… del payload
  type      String
  createdAt DateTime @default(now())
}

// En el handler:
try {
  await prisma.processedWebhook.create({ data: { id: event.id, type: event.type } });
} catch (e) {
  if (e.code === 'P2002') {
    // Duplicate — ya procesado. Responde 200 igualmente.
    return res.status(200).send('ok');
  }
  throw e;
}`,
        },
      ],
    },
    {
      title: '5. Prueba con curl',
      body: 'Genera tú mismo una firma válida y simula un evento contra tu propio endpoint local. Te ahorra esperar a que Isaak emita uno real.',
      code: [
        {
          language: 'bash',
          label: 'Generar firma + enviar',
          content: `SECRET="whsec_xxx"
TS=$(date +%s)
BODY='{"id":"evt_test","type":"invoice.issued","data":{}}'
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')

curl -X POST http://localhost:3000/webhooks/isaak \\
  -H "Content-Type: application/json" \\
  -H "x-isaak-timestamp: $TS" \\
  -H "x-isaak-signature: $SIG" \\
  -d "$BODY"`,
        },
      ],
    },
  ],
  nextSteps: [
    { label: 'Catálogo completo de eventos', href: '/developers/webhooks' },
    { label: 'Códigos de error y reintentos', href: '/developers/errors' },
    { label: 'Rate limits de la API', href: '/developers/rate-limits' },
  ],
};

const CONECTAR_HOLDED: Guide = {
  slug: 'conectar-holded-api',
  title: 'Conectar Holded (ERP) en 5 minutos',
  eyebrow: 'Integración',
  icon: Plug,
  summary:
    'Conecta tu cuenta de Holded a Isaak con la API key del ERP. Las keys se cifran AES-256-GCM antes de guardarse — nunca viajan en claro entre apps.',
  readingMinutes: 4,
  prerequisites: [
    'Cuenta Holded con permisos para generar API keys',
    'API key de Isaak (isk_live_… o isk_test_…)',
  ],
  steps: [
    {
      title: '1. Genera la API key en Holded',
      body: 'En Holded entra a Configuración → Desarrolladores → API → Nueva API key. Copia el valor — Holded solo lo muestra una vez. Necesitas permisos de lectura sobre Contactos, Documentos y Catálogo.',
    },
    {
      title: '2. Envía la key a Isaak',
      body: 'POST /api/v1/integrations/holded/api-key con la key en el body. Isaak la cifra con AES-256-GCM usando HOLDED_KEY_SECRET y la guarda en tu fila de tenant. Nunca queda en logs ni en respuestas.',
      code: [
        {
          language: 'bash',
          label: 'POST /api/v1/integrations/holded/api-key',
          content: `curl -X POST https://isaak.verifactu.business/api/v1/integrations/holded/api-key \\
  -H "Authorization: Bearer $ISAAK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "holdedApiKey": "TU_HOLDED_API_KEY" }'`,
        },
        {
          language: 'json',
          label: 'Respuesta',
          content: `{
  "ok": true,
  "data": {
    "connected": true,
    "holdedAccountName": "Acme SL",
    "lastSyncAt": null
  }
}`,
        },
      ],
      callout: {
        kind: 'success',
        text: 'Si la key es válida, Isaak hace una llamada de verificación a /me en la API de Holded y guarda el nombre de la cuenta. Si no, devuelve 400 invalid_holded_key sin tocar tu BBDD.',
      },
    },
    {
      title: '3. Lanza la primera sincronización',
      body: 'El sync extrae contactos, facturas emitidas y recibidas. Lo lanzas a demanda — Isaak no lo programa automáticamente para no consumir tu quota Holded.',
      code: [
        {
          language: 'bash',
          label: 'POST /api/v1/integrations/holded/sync',
          content: `curl -X POST https://isaak.verifactu.business/api/v1/integrations/holded/sync \\
  -H "Authorization: Bearer $ISAAK_API_KEY"`,
        },
      ],
    },
    {
      title: '4. Verifica el estado',
      body: 'GET /api/v1/integrations/accounting/status devuelve el estado de todas tus integraciones contables (Holded, Chift cuando esté activo, etc.). Útil para mostrar un "conectado" en tu propio UI.',
      code: [
        {
          language: 'bash',
          label: 'GET /api/v1/integrations/accounting/status',
          content: `curl https://isaak.verifactu.business/api/v1/integrations/accounting/status \\
  -H "Authorization: Bearer $ISAAK_API_KEY"`,
        },
      ],
    },
    {
      title: '5. Desconecta cuando quieras',
      body: 'DELETE elimina la API key cifrada. Tras esto Isaak no puede leer ni escribir en Holded. Los datos ya sincronizados quedan en Isaak, pero no se actualizan más.',
      code: [
        {
          language: 'bash',
          label: 'DELETE /api/v1/integrations/holded/api-key',
          content: `curl -X DELETE https://isaak.verifactu.business/api/v1/integrations/holded/api-key \\
  -H "Authorization: Bearer $ISAAK_API_KEY"`,
        },
      ],
    },
  ],
  nextSteps: [
    { label: 'Listado de integraciones soportadas', href: '/conectores' },
    { label: 'Webhooks: reaccionar a sincronizaciones', href: '/developers/guides/webhooks-hmac' },
    { label: 'Estado de conectores en vivo', href: 'https://holded.verifactu.business' },
  ],
};

const MCP_CLAUDE_DESKTOP: Guide = {
  slug: 'mcp-claude-desktop',
  title: 'Conectar Isaak a Claude Desktop (MCP)',
  eyebrow: 'MCP',
  icon: Bot,
  summary:
    'Añade el servidor MCP de Isaak a Claude Desktop para que el modelo pueda consultar tus facturas y emitir a VeriFactu desde la conversación.',
  readingMinutes: 4,
  prerequisites: [
    'Claude Desktop instalado (Mac, Windows o Linux)',
    'API key de Isaak con scope mcp.invoke',
    'Plan Starter o superior (MCP requiere autenticación API key)',
  ],
  steps: [
    {
      title: '1. Localiza el archivo de configuración',
      body: 'Claude Desktop lee la configuración MCP de un archivo JSON. Si no existe, créalo con contenido vacío {} antes de editar.',
      code: [
        {
          language: 'bash',
          label: 'Rutas por plataforma',
          content: `# macOS
~/Library/Application Support/Claude/claude_desktop_config.json

# Windows
%APPDATA%\\Claude\\claude_desktop_config.json

# Linux
~/.config/Claude/claude_desktop_config.json`,
        },
      ],
    },
    {
      title: '2. Añade el servidor Isaak',
      body: 'Pega el bloque mcpServers.isaak con tu API key. Si ya tienes otros servidores configurados, añade isaak dentro del objeto mcpServers existente.',
      code: [
        {
          language: 'json',
          label: 'claude_desktop_config.json',
          content: `{
  "mcpServers": {
    "isaak": {
      "url": "https://isaak.verifactu.business/api/mcp/isaak",
      "headers": {
        "Authorization": "Bearer isk_live_TU_API_KEY"
      }
    }
  }
}`,
        },
      ],
      callout: {
        kind: 'warn',
        text: 'No commitees este archivo a git con tu API key real. En equipos compartidos usa una key de scope reducido (solo lectura) si tu uso es exploratorio.',
      },
    },
    {
      title: '3. Reinicia Claude Desktop',
      body: 'Cierra Claude Desktop por completo (Cmd+Q en Mac) y vuelve a abrir. La primera vez tarda unos segundos en establecer la conexión con el servidor MCP.',
    },
    {
      title: '4. Confirma las herramientas disponibles',
      body: 'En el icono de "plug" abajo a la izquierda del chat verás isaak con un punto verde si la conexión funciona. Click para ver las 9 herramientas: listar facturas, crear borrador, validar antes de emitir, etc.',
      callout: {
        kind: 'info',
        text: 'Si ves un punto rojo, abre Configuración → Developer → Logs en Claude Desktop. Errores típicos: API key inválida (401) o URL mal escrita.',
      },
    },
    {
      title: '5. Prueba con una conversación',
      body: 'Pregunta a Claude algo como "¿Cuáles fueron mis facturas más altas en abril?" o "Crea un borrador para Acme SL por 500€ de consultoría". Claude usará automáticamente las tools MCP — verás un panel con la herramienta y los argumentos antes de ejecutarse.',
    },
  ],
  nextSteps: [
    { label: 'Listado completo de tools MCP', href: '/developers#mcp' },
    { label: 'Debuggear con MCP Inspector', href: '/developers#inspector' },
    { label: 'Conector Holded para Claude', href: 'https://claude.verifactu.business' },
  ],
};

// ─── Catálogo exportado ────────────────────────────────────────────────────────

export const GUIDES: Guide[] = [
  PRIMERA_FACTURA,
  WEBHOOKS_HMAC,
  CONECTAR_HOLDED,
  MCP_CLAUDE_DESKTOP,
];

export const GUIDES_BY_SLUG: Record<string, Guide> = Object.fromEntries(
  GUIDES.map((g) => [g.slug, g])
);

export function getGuide(slug: string): Guide | undefined {
  return GUIDES_BY_SLUG[slug];
}
