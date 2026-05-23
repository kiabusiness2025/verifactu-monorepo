# ISAAK — Roadmap por Fases

> Última actualización: 2026-05-23

---

## Timeline general

```
MES 1–2   ████████████  FASE 1 · Core MVP + Lanzamiento               ✅ COMPLETADO
MES 2–3   ████████████  FASE 1.5 · Holded API Full Coverage + Resiliencia  🔄 EN CURSO
MES 3–4   ████████████  FASE 2 · Calendar + Email
MES 5–7   ████████████  FASE 3 · OCR auto + inbox facturas + multi-ERP
MES 8–10  ████████████  FASE 4 · Voz + Documentos mercantiles
MES 11–14 ████████████  FASE 5 · Banca PSD2 + Conciliación
MES 15–20 ████████████  FASE 6 · RRHH + Sistema RED (TGSS) + Asesoramiento Laboral
```

---

---

## FASE 1.5 — Holded API Full Coverage + Resiliencia · EN CURSO

**Duración:** 2–3 semanas  
**Objetivo:** Cubrir todos los endpoints útiles de Holded que no aprovechábamos, reforzar la resiliencia de los tres clientes HTTP, y enriquecer el contexto de Isaak con datos fiscales críticos (Verifactu, P&L, pagos, envíos).

### Resiliencia HTTP — Implementado

| Cliente | Antes | Ahora |
|---|---|---|
| `apps/holded/app/lib/holded-api-client.ts` | Sin retry, sin timeout | Retry 2×, backoff exponencial + jitter, timeout 10s |
| `apps/app/lib/integrations/accounting.ts` | Sin retry (solo timeout) | Retry 2× para 429/502/503/504 + backoff + jitter |
| `apps/isaak/app/lib/holded-api.ts` | Retry fijo sin jitter | Retry 2×, backoff con jitter ±50%, timeout 10s |

Patrón uniforme: `MAX_RETRIES = 2`, `base = 200ms · 2^n ± 50% jitter`, reintentos para HTTP 429/502/503/504.

### Nuevas funciones Holded para Isaak — Implementado

Añadidas en `apps/isaak/app/lib/holded-api.ts`:

#### `holdedGetVerifactuStatus(apiKey, invoiceId)` → `VerifactuStatus`
Extrae los campos Verifactu/SII del documento Holded (`uuid`, `qrBase64`, `huella`, `sentAt`).
Holded embebe estos datos en la respuesta estándar de factura cuando Verifactu está activo — no hay endpoint dedicado.
**Caso de uso:** Isaak responde "¿está esta factura en AEAT?" con certeza en lugar de redirigir al ERP.

#### `holdedGetPnL(apiKey, params?)` → `PnLSummary`
Agrega `/accounting/v1/dailyledger` por cuentas del PGC español (7xx = ingresos, 6xx = gastos)
y devuelve `{ income, expenses, grossProfit, margin, period }`.
Holded **no expone** P&L por API — esto es un diferenciador real frente al MCP comunitario.
**Caso de uso:** "¿Cómo voy de margen este trimestre?" → Isaak responde sin que el usuario abra ningún informe.

#### `holdedSendDocument(apiKey, docType, documentId, params)` → `{ ok, raw }`
Llama a `POST /documents/{type}/{id}/send` con array de emails, subject y body opcional.
**Caso de uso:** "Envía la factura F-2026/031 a proveedor@empresa.es" → acción completa desde el chat.

#### `holdedCreateExpense(apiKey, params)` → `{ id, docNumber, raw }`
Crea un gasto (`/documents/purchase`) en Holded con líneas estructuradas.
Cierra el loop del OCR: Vision extrae datos → Isaak crea el gasto → usuario confirma en 1 click.

#### `holdedListPayments(apiKey, params?)` → `{ payments, total, truncated }`
Lista cobros/pagos de los últimos 90 días por defecto.
**Caso de uso:** conciliación básica, alertas de pagos pendientes.

### Próximos pasos de esta fase

- [ ] Integrar `holdedGetPnL` en `holded-analytics.ts` → aparece en el dashboard y en el sistema prompt
- [ ] Crear `app/api/actions/send-document/route.ts` → endpoint REST que Isaak puede llamar
- [ ] Crear `app/api/actions/create-expense/route.ts` → endpoint REST para el flujo OCR → Holded
- [ ] Añadir `verifactu_status` a las workspace signals proactivas (alertas de facturas sin UUID)
- [ ] Tests unitarios para `holdedGetPnL` y `holdedGetVerifactuStatus`

---

## FASE 1 — Core MVP · LANZAMIENTO ✅ COMPLETADO

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

## FASE 6 — RRHH + Sistema RED (TGSS) + Asesoramiento Laboral

**Duración:** 8–12 semanas (MES 15–20)  
**Objetivo:** Convertir a Isaak en el asesor laboral de referencia para PYMES españolas. El área laboral es inseparable de la fiscal: las nóminas determinan las retenciones IRPF (mod 111/180) y las cotizaciones a la Seguridad Social impactan directamente en los costes y en el IS. La integración con el Sistema RED de la TGSS cierra el loop que Holded no puede cerrar.

### FASE 6A — Base desde Holded (primeras semanas)

Holded expone datos de equipo/empleados que ya consumimos (`holdedListEmployees`, `clockin/clockout`). En esta fase los estructuramos como contexto laboral:

```
Holded Team API → ErpEmployee → IsaakLaborContext
  - Roster completo de empleados (nombre, contrato, departamento)
  - Registro de horas (cumplimiento RD 8/2019 — registro horario)
  - Estimación de coste laboral por empleado (si se añaden campos de salario)
  - Alertas: contratos que vencen, revisiones salariales pendientes
```

**Tools Isaak nuevas (FASE 6A):**
- `holded_labor_summary(tenantId)` → roster + horas del mes + alertas laborales
- `holded_time_compliance(tenantId)` → ¿cumple el RD 8/2019? Gaps en fichajes

### FASE 6B — Sistema RED (TGSS) · REDirect API

```
Autenticación:
  - Certificado digital de empresa (FNMT o equivalente)
  - Identificador RED (número de autorizado)
  - Endpoint: https://sede.seg-social.gob.es/ServicioRED/wdsl/...

Operaciones planificadas:
  GET  /afiliados/{naf}          → consulta afiliado por NAF/NIF
  GET  /cotizaciones/{periodo}   → TC1/TC2 del periodo
  POST /liquidaciones/directa    → envío Liquidación Directa (sustitución TC1/TC2)
  POST /afiliacion/alta          → alta de trabajador (modelo TA.2/S)
  POST /afiliacion/baja          → baja de trabajador
  GET  /partes-comunicados       → partes IT/AT comunicados
  GET  /bases-cotizacion/{naf}   → bases y tipos de cotización
```

**Flujo de asesoramiento laboral:**
```
Usuario: "¿Están al día las cotizaciones de este mes?"
Isaak:
  1. Consulta RED: cotizaciones periodo actual
  2. Cruza con Holded: empleados activos vs afiliados
  3. Detecta discrepancias (baja médica no comunicada, empleado nuevo sin alta)
  4. "Tienes 2 incidencias: Julia García no aparece dada de alta en TGSS
     (la incorporaste el 14/05). ¿La doy de alta ahora?"
  5. Usuario confirma → POST /afiliacion/alta → confirmación TGSS
```

**Prerrequisitos técnicos:**
- Certificado digital empresa (P12) → almacenado cifrado en BD por tenantId
- Configuración del número de autorizado RED
- Autorización del usuario vía firma digital o PIN 24H

### FASE 6C — Integración Software Nóminas (A3nom / Sage Nóminas)

Holded no tiene módulo de nóminas completo. Para PYMES con asesoría:

```typescript
// Interfaz normalizada NóminasConnector
interface NominasConnector {
  listPayrolls(period: string): Promise<Payroll[]>;
  getPayslip(employeeId: string, period: string): Promise<Payslip | null>;
  exportTc1(period: string): Promise<Buffer>;   // Modelo TC1 / Liquidación Directa
  exportMod111(year: number, quarter: number): Promise<Buffer>; // IRPF retenciones
}

// Implementaciones planificadas
class A3nomConnector implements NominasConnector { ... }  // A3nom vía export XLS
class SageNominasConnector implements NominasConnector { ... } // Sage vía API REST
class ManualUploadConnector implements NominasConnector { ... } // CSV/PDF upload
```

**Casos de uso Isaak:**
- "¿Cuánto IRPF tengo que ingresar este trimestre?" → suma retenciones nóminas → borrador mod 111
- "¿Hay alguna nómina con retención por debajo del mínimo?" → auditoría automática
- "Genera el TC1 de mayo" → export con datos validados → descarga en 1 click
- "¿Cuánto me cuesta realmente María en términos de coste total empresa?" → salario bruto + SS empresa + bonus prorrateado

### Módulo Advisory RRHH

```
Convenios colectivos:
  - Base de datos por CNAE → convenio aplicable
  - Isaak alerta si el salario está por debajo del SMI o del mínimo del convenio
  - Revisor de tablas salariales actualizado anualmente

Cálculos laborales:
  - Liquidación (finiquito) por tipo de despido
  - Vacaciones pendientes y cost de disfrute vs compensación
  - Coste de una baja IT para la empresa (vs mutua/TGSS)

Modelos fiscales laborales (borradores):
  - Modelo 111: retenciones IRPF trimestral
  - Modelo 180: resumen anual retenciones IRPF trabajo
  - Modelo 190: declaración informativa anual
  - TC1 / Liquidación Directa: cotizaciones SS mensuales
```

### Métricas de éxito Fase 6

- 40% usuarios plan Business conectan Sistema RED
- 20% reducción en errores de cotización detectados antes de envío
- €25.000 MRR  
- Primer convenio con gestoría/asesoría laboral como partner

---

## Decisiones de arquitectura que no cambian entre fases

1. **El ERP nunca se modifica sin confirmación explícita del usuario**
2. **Streaming siempre** — el usuario ve la respuesta aparecer en tiempo real
3. **Tool calls transparentes** — el UI muestra qué herramienta está usando Isaak en cada momento
4. **Caché agresivo** — datos del ERP en Redis para no abusar de las APIs de terceros
5. **Multi-tenant desde día 1** — el diseño de BD separa datos por `tenantId` desde Fase 1
6. **Nóminas nunca se modifican sin doble confirmación** — las acciones sobre TGSS (altas/bajas) requieren confirmación explícita y registro de auditoría
