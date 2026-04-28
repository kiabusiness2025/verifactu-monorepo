# ISAAK — Roadmap por Fases

> Última actualización: 2026-04-28

---

## Timeline general

```
MES 1–2   ████████████  FASE 1 · Core MVP + Lanzamiento
MES 3–4   ████████████  FASE 2 · Calendar + Email (paralelo a crecimiento F1)
MES 5–7   ████████████  FASE 3 · OCR auto + inbox facturas + multi-ERP
MES 8–10  ████████████  FASE 4 · Voz + Documentos mercantiles
MES 11–14 ████████████  FASE 5 · Banca PSD2 + Conciliación
```

---

## FASE 1 — Core MVP · LANZAMIENTO

**Duración:** 6–8 semanas  
**Objetivo:** Usuarios de Holded hablan con su negocio, ven un dashboard básico. Primera monetización.  
**Entregable:** Plataforma en producción con primeros usuarios de pago.

### Funcionalidades

#### Chat full-page con tool_use real

- UI de chat a pantalla completa (expandir IsaakWidget)
- Sidebar con historial de conversaciones
- Loop `tool_use` con los 20 tools de Holded
- Streaming de respuesta al usuario
- Respuestas enriquecidas: texto + cards + gráficos inline (Recharts)
- Adjuntos: imágenes y PDFs en el chat → Claude Vision

#### Dashboard de KPIs

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Facturado   │ Cobrado     │ Pendiente   │ IVA T actual│
│ este mes    │ este mes    │ de cobro    │ estimado    │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌──────────────────────────┬──────────────────────────────┐
│ Evolución facturación    │ Top 5 clientes por volumen   │
│ [LineChart 6 meses]      │ [BarChart horizontal]         │
└──────────────────────────┴──────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Alertas Isaak                                            │
│ ⚠ Muebles Duran: 31 días sin pagar (€3.480)             │
│ ⏰ IVA T2: presentación en 12 días                        │
│ 📉 Margen este mes -8% vs mismo periodo año anterior     │
└──────────────────────────────────────────────────────────┘
```

#### Análisis proactivo (cron diario 8:00)

- Detecta facturas vencidas → crea `IsaakAlert`
- Calcula IVA estimado del trimestre en curso
- Compara margen con periodo anterior
- Genera digest semanal por email (lunes 9:00)

#### OCR de imágenes en el chat (Fase 1 básico)

- Usuario adjunta foto de ticket/factura
- Claude Vision extrae: emisor, NIF, fecha, base, IVA, total
- Card con datos + botón "Crear gasto en Holded"
- Usuario confirma → `holded_create_expense_draft` tool

#### Onboarding guiado

1. Conecta Holded (API key → validación)
2. Isaak analiza los últimos 3 meses → resumen inicial personalizado
3. Personalización: nombre empresa, sector, nombre del gestor
4. Primera conversación guiada

#### Stripe + suscripciones

- Productos: Trial (30d gratis) + Starter + Pro + Business
- Webhooks: `customer.subscription.*` → actualiza plan en BD
- Portal de cliente (Stripe Billing Portal) para gestionar plan/factura

### Stack Fase 1

```
Next.js 15 + Tailwind + Prisma  (ya en uso en holded app)
Anthropic SDK                    (ya instalado)
OpenAI SDK                       (añadir)
Recharts                         (gráficos)
react-markdown + rehype-highlight (formato respuestas)
Stripe SDK                       (facturación)
Upstash Redis                    (caché)
Cloudflare R2                    (adjuntos)
Resend                           (emails)
```

### Métricas de éxito Fase 1

- Semana 8: 50 usuarios en trial
- Mes 2: 15–20 usuarios de pago, €600–800 MRR
- NPS > 50 tras primer mes de uso

---

## FASE 2 — Calendar + Email

**Duración:** 4–6 semanas (empieza en paralelo a crecimiento de F1)  
**Objetivo:** Isaak se integra con calendario y correo. Recordatorios automáticos y detección de facturas en email.

### Funcionalidades

#### OAuth Google Workspace / Microsoft 365

```
Scopes Google:    calendar.events, gmail.readonly, gmail.labels
Scopes Microsoft: Calendars.ReadWrite, Mail.Read
```

#### Calendar tools

- `calendar_create_event(title, date, description, attendees?)`
- `calendar_list_upcoming(days: number)`
- `calendar_create_reminder(message, dueAt)`

**Casos de uso:**

- "Recuérdame llamar a Muebles Duran el viernes" → evento en Google Calendar con contexto de la factura
- "¿Qué reuniones tengo esta semana con clientes con facturas pendientes?" → cross-reference Calendar + Holded
- Alerta automática 7 días antes del IVA: Isaak crea evento "Presentación modelo 303"

#### Lectura de facturas en email (semi-auto)

- Isaak escanea Gmail/Outlook buscando adjuntos PDF/imagen de proveedores
- OCR + extracción de datos
- Muestra en UI: "3 facturas detectadas en tu correo — ¿las contabilizo?"
- Usuario confirma → se crean gastos en Holded

#### Notificaciones inteligentes

- Push web (Service Worker) para alertas urgentes
- Email digest semanal con resumen personalizado
- Umbral configurable: usuario define cuándo quiere alertas

### Métricas de éxito Fase 2

- 30% usuarios activos conectan calendario
- 20% usuarios activos conectan email
- Churn mensual < 5%

---

## FASE 3 — OCR Automático + Inbox + Multi-ERP

**Duración:** 6–8 semanas  
**Objetivo:** Isaak contabiliza facturas recibidas por email de forma automática. Soporte para un segundo ERP.

### Funcionalidades

#### Inbox de facturas dedicado

```
Dirección: facturas-{empresa}@isaak.es

Flujo:
1. Proveedor envía factura a ese email
2. Webhook Resend → Isaak recibe raw email
3. Extracción adjuntos → OCR pipeline completo
4. Validación NIF (AEAT API o regex)
5. Matching proveedor en Holded por NIF
6. Claude sugiere cuenta contable (PGC)
7. Borrador en Holded → notificación al usuario
8. Usuario confirma en 1 click → contabilizada
```

#### OCR pipeline completo

```
PDF → pdf-parse → texto plano
  ↓
Si imagen → sharp (resize/normalize) → Claude Vision
  ↓
Extracción estructurada:
  {
    emisor, nif, numero_factura, fecha,
    lineas: [{ descripcion, cantidad, precio, tipo_iva, cuota }],
    base_total, iva_total, total,
    cuenta_contable_sugerida  // Claude sugiere basándose en descripción
  }
  ↓
Validación: suma líneas == total, formato NIF válido
  ↓
Match proveedor en Holded → asociar o crear nuevo
  ↓
Crear borrador gasto en Holded + notificar usuario
```

#### Multi-ERP: segundo conector

**Target Fase 3:** Sage 50 o A3 Asesor (según demanda de usuarios)

```typescript
// Interfaz normalizada — todos los ERPs la implementan
interface ERPConnector {
  id: string;
  tools: ToolDefinition[];
  execute(toolName: string, params: unknown, auth: ConnectorAuth): Promise<unknown>;
  healthCheck(auth: ConnectorAuth): Promise<boolean>;
}

// Registro dinámico
const CONNECTORS: Record<string, ERPConnector> = {
  holded: new HoldedConnector(),
  sage50: new Sage50Connector(), // Fase 3
  a3: new A3Connector(), // Fase 3 o 4
};
```

#### Generación de documentos básicos

- Presupuesto/oferta en PDF (con datos de producto/cliente de Holded)
- Informe mensual de gestión (PDF automático con gráficos + análisis Claude)
- Factura proforma

### Métricas de éxito Fase 3

- 60% facturas recibidas procesadas automáticamente
- < 2% tasa de error en OCR
- Primer cliente usando segundo ERP

---

## FASE 4 — Voz + Documentos Mercantiles

**Duración:** 6–8 semanas  
**Objetivo:** Interfaz de voz. Documentos legales y modelos fiscales.

### Funcionalidades

#### Voz — entrada (STT)

```
Web: MediaRecorder API → WAV → Whisper (OpenAI) → texto → chat
PWA móvil: mismo flow, botón micrófono nativo
Latencia objetivo: < 1.5 segundos para transcripción
```

#### Voz — salida (TTS)

```
Respuesta de Claude → ElevenLabs API → audio stream
Voz "Isaak": española, clara, profesional pero cercana
Toggle en UI: modo texto / modo voz
Configuración: tono, velocidad
```

#### Documentos mercantiles y fiscales

Templates con datos reales de Holded, redactados por Claude:

```
Contratos:
  - Contrato de compraventa de bienes
  - Contrato de prestación de servicios
  - Carta de reclamación de deuda (con historial de factura Holded)
  - Poder notarial básico

Presupuestos:
  - Oferta comercial (con productos/precios de Holded)
  - Presupuesto de obra/proyecto

Modelos fiscales (borradores):
  - Modelo 303 (IVA trimestral)
  - Modelo 347 (operaciones > €3.005,06)
  - Modelo 390 (resumen anual IVA)
  - Modelo 111 / 180 (retenciones IRPF)
  - Contexto para Impuesto sobre Sociedades (IS)

Proceso:
  Usuario: "Prepara un contrato de servicios para Tech Solutions"
  → Busca Tech Solutions en Holded CRM
  → Rellena template con datos fiscales del cliente
  → Claude redacta cláusulas adaptadas al sector
  → Genera PDF descargable
  → Opción: solicitar firma digital (Signaturit/DocuSign)
```

#### PWA Móvil

- Progressive Web App del chat de Isaak
- Notificaciones push nativas
- Escáner de documentos con cámara → OCR automático
- Instalable directamente desde navegador (sin App Store)

### Métricas de éxito Fase 4

- 20% usuarios activos usan voz al menos una vez por semana
- NPS > 60

---

## FASE 5 — Banca PSD2 + Conciliación + Tesorería

**Duración:** 8–10 semanas  
**Objetivo:** Isaak conectado a cuentas bancarias. Conciliación automática, alertas y previsión de liquidez.

### Funcionalidades

#### Open Banking PSD2

```
Provider: Nordigen (GoCardless) — cobertura España + Europa
Bancos: BBVA, Santander, CaixaBank, Bankinter, Sabadell, ING...

Flujo de conexión:
1. Usuario selecciona banco en settings
2. Redirect Nordigen → banco → login → consentimiento PSD2
3. Isaak guarda token cifrado
4. Lectura de transacciones hasta 90-180 días
5. Renovación de consentimiento cada 90 días
```

#### Conciliación automática (cron diario 6:00)

```
Algoritmo de matching:
1. Fetch transacciones bancarias nuevas (Nordigen)
2. Fetch movimientos Holded (diario contable)
3. Matching por prioridad:
   - Match exacto: importe + fecha (±3 días) + IBAN → ✅ auto-conciliado
   - Match probable: importe + nombre cliente (fuzzy) → ⚠ revisar
   - Sin match → ❓ pendiente manual
4. Dashboard de conciliación:
   ✅ 12 conciliados automáticamente hoy
   ⚠ 3 para revisar
   ❓ 1 sin referencia
5. Un click para confirmar los probables
6. Actualiza estado en Holded
```

#### Sistema de alertas de tesorería

```
Alertas configurables:
  - Saldo < €X → push inmediato
  - Cobro esperado > N días de retraso → aviso
  - Pago recurrente detectado → confirmación mensual
  - Transacción inusual (> 2σ promedio) → alerta anomalía
  - Previsión cash flow negativo en 30d → alerta preventiva
```

#### Dashboard bancario

```
┌─────────────────────┬─────────────────────────────────────────┐
│ Saldo real (bancos) │ Saldo contable (Holded) │ Diferencia    │
│ €48.230             │ €44.650                 │ €3.580 pend.  │
└─────────────────────┴─────────────────────────┴───────────────┘
┌──────────────────────────────────────────────────────────────────┐
│ Previsión de liquidez — próximos 90 días                         │
│ [Area chart: saldo real + cobros previstos + pagos estimados]    │
│ Escenario optimista / base / pesimista                           │
└──────────────────────────────────────────────────────────────────┘
```

#### Análisis conversacional de tesorería

```
Usuario: "¿Podré pagar las nóminas el mes que viene?"
Isaak:
  1. Obtiene saldo bancario real (Nordigen)
  2. Lista cobros pendientes con fecha de vencimiento (Holded)
  3. Detecta gastos fijos recurrentes del historial bancario
  4. Calcula posición proyectada a fin de mes
  5. "Con los cobros previstos de Tech Solutions (€8.400 el 15/06)
     y excluyendo a Muebles Duran (31 días de retraso, riesgo alto),
     tu posición el 30/06 estaría en €12.300. Pero recomiendo
     llamar a Muebles Duran hoy — ¿lo agendo?"
```

### Métricas de éxito Fase 5

- €15.000 MRR
- Plan Business > 30% del mix de ingresos
- 50% usuarios plan Business conectan banco

---

## Decisiones de arquitectura que no cambian entre fases

1. **El ERP nunca se modifica sin confirmación explícita del usuario**
2. **Streaming siempre** — el usuario ve la respuesta aparecer en tiempo real
3. **Tool calls transparentes** — el UI muestra qué herramienta está usando Isaak en cada momento
4. **Caché agresivo** — datos del ERP en Redis para no abusar de las APIs de terceros
5. **Multi-tenant desde día 1** — el diseño de BD separa datos por `tenantId` desde Fase 1
