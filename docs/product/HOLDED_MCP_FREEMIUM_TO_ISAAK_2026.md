# Holded MCP → Isaak — Plan freemium y funnel de conversión

Fecha: 2026-05-03
Autor: análisis Claude para Verifactu Business
Audiencia: producto + revenue + marketing

---

## Tesis en una frase

**El conector Holded MCP es el anuncio más barato posible para Isaak.** Los usuarios prueban Claude+Holded gratis, generan word-of-mouth en LinkedIn/Twitter/comunidad Holded, y descubren naturalmente Isaak cuando su uso supera lo que el MCP gratuito ofrece. Verifactu no compite con Holded — complementa, y el handoff hacia Isaak es donde cierra el funnel.

---

## Mapa de productos confirmado tras revisar el monorepo

| Surface                                                             | Rol                                                                                              | Quién paga el cómputo                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Conector Holded MCP en Claude** (`claude.verifactu.business/mcp`) | Acceso conversacional ligero a Holded vía Claude.ai del usuario                                  | Anthropic (tokens del usuario) + Verifactu (proxy MCP, ~€0.01/usuario/mes) |
| **Isaak en `isaak.verifactu.business`**                             | Producto principal: chat con memoria, libros AEAT, sync ERP, presupuestos, conciliación bancaria | Verifactu (OpenAI/Gemini API + infra)                                      |
| **Dashboard `verifactu.business`** (`apps/app`)                     | Panel avanzado, sync, audit, configuración fiscal                                                | Verifactu (infra)                                                          |
| **App pública Isaak for Holded** (futura, en ChatGPT)               | Mismo Isaak pero via ChatGPT como canal                                                          | Verifactu + tokens del usuario en ChatGPT                                  |

Regla operativa que ya tienes documentada (de `ISAAK_HOLDED_SHARED_CONNECTIONS.md`):

> "Holded: fuente externa autorizada por API key.
> Isaak: cara visible y asistente fiscal-contable.
> Verifactu: core de identidad, motor fiscal, sync y auditoría.
> ChatGPT y dashboard: dos canales sobre el mismo core."

El MCP Holded en Claude se convierte en un **cuarto canal sobre el mismo core**. Encaja perfecto en la arquitectura ya planeada.

---

## Por qué la estrategia "free → upsell Isaak" es la correcta

### Lo que YA tiene Isaak (de `ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md`)

| Feature Isaak                                                                       | El conector MCP Holded ¿lo tiene?                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Chat conversacional con memoria persistente entre sesiones                          | ❌ Claude tiene memoria por chat, no por usuario+empresa |
| Historial de conversaciones del tenant (buscable)                                   | ❌                                                       |
| Conversaciones compartidas (shareable links)                                        | ❌                                                       |
| Sugerencias automáticas de gastos (`isaak-suggest`)                                 | ❌                                                       |
| Libros AEAT generados (Modelo 303, 130)                                             | ❌                                                       |
| Presupuestos con workflow accept/reject/convert                                     | ❌                                                       |
| Movimientos bancarios + conciliación con facturas                                   | ❌                                                       |
| Integración contable bidireccional con ERP (push/pull/conflicts)                    | ❌                                                       |
| Acciones proactivas en dashboard (`/api/dashboard/actions`)                         | ❌                                                       |
| Multi-tenant con plans (`canBidirectionalQuotes`, `canUseAccountingApiIntegration`) | ❌                                                       |
| Sub-procesador único, datos en EU, audit logs                                       | ✅ ambos lo tienen                                       |

**El MCP Holded es 1/10 de lo que es Isaak.** Y debe seguir siéndolo. Si el MCP intenta replicar Isaak, canibalizas tu propio producto. Si el MCP es deliberadamente más simple, es la mejor publicidad de Isaak: "te gusta esto? hay 10× más en Isaak".

### Por qué freemium gana sobre 100% gratis o 100% pagado

**100% gratis** → el conector funciona, pero no convierte usuarios a Isaak. La gente lo usa eternamente sin pagar. Coste de hosting crece linealmente sin retorno.

**100% pagado** → barrera de entrada alta. Anthropic no acepta de buen grado conectores que cobran por su MCP en el directorio. Pierdes la curva de adopción inicial.

**Freemium con límite suave** → los usuarios casuales se quedan en free (te promocionan). Los usuarios power, que SON los que generan ingresos en cualquier SaaS B2B, llegan al límite y descubren Isaak. Los costes de hosting están acotados porque los pesados pagan.

---

## Plan freemium concreto

### Tier 0 — MCP Holded en Claude (gratis para siempre, limitado)

| Recurso                                                    | Límite                                              |
| ---------------------------------------------------------- | --------------------------------------------------- |
| Tool calls totales                                         | **200 / mes / cuenta Holded** (≈ 7 al día)          |
| `create_invoice_draft`                                     | **5 borradores / mes** (límite duro, no se acumula) |
| `get_document_pdf`                                         | **20 PDFs / mes** (la tool más cara en bandwidth)   |
| Tools de catálogos (`list_taxes`, `list_numbering_series`) | Ilimitadas (cacheables, coste cero)                 |
| Resto de tools de lectura                                  | Cuentan al total de 200/mes                         |
| Soporte                                                    | Solo email comunidad, best-effort                   |

**Cuando el usuario llega al 90 % del límite**, las tools devuelven un campo extra `_quotaWarning` con texto:

```json
{
  "contacts": [...],
  "_quotaWarning": "Has usado 180 de 200 llamadas MCP este mes. Para uso ilimitado, memoria entre conversaciones, libros AEAT 303/130 e integración contable bidireccional, prueba Isaak gratis 14 días → https://isaak.verifactu.business/?utm_source=holded_mcp&utm_medium=quota_warning"
}
```

Cuando llega al **100 %**, las tools de **escritura** (`create_invoice_draft`) y **PDF** se bloquean con un mensaje upsell. Las tools de lectura siguen funcionando hasta el final del mes (no rompemos UX a usuarios casuales).

### Tier 1 — Isaak Starter (€9/mes o €90/año)

Para autónomos y micro-PYMES que ya usan el MCP intensivamente.

- Todo lo del MCP gratuito **sin límites**
- Chat Isaak ilimitado con memoria persistente
- Historial de conversaciones (buscable)
- Sugerencias automáticas de gastos
- Libros AEAT (Modelo 303 y 130 exportables a Excel)
- Sin integración bidireccional (read-only)
- Soporte por email <24h

### Tier 2 — Isaak Pro (€29/mes o €290/año)

Para PYMES activas con múltiples usuarios.

- Todo lo de Starter
- Presupuestos bidireccionales (sync con ERP)
- Movimientos bancarios + conciliación
- Hasta 3 usuarios en el mismo tenant
- Conversaciones compartidas
- Soporte por email <8h
- Acciones proactivas en dashboard

### Tier 3 — Isaak Empresa (€79/mes o €790/año, o personalizado)

Para asesorías, despachos, PYMES grandes.

- Todo lo de Pro
- Integración contable bidireccional con ERP (push/pull/conflicts) — `canUseAccountingApiIntegration`
- Audit logs completos
- Sync activa con conflictos gestionables
- Usuarios ilimitados
- API de Isaak (no solo MCP — REST completa)
- Soporte por chat + onboarding 1:1
- SLA con backup diario

---

## Mecánica del funnel (de gratis a pagado)

```
[Usuario lanza Claude.ai]
         ↓
[Conecta MCP Holded gratis] ←————————— promoción LinkedIn / comunidad Holded / SEO Holded MCP
         ↓
[Usa 7-30 calls/mes]  → "100% feliz, evangeliza, recomienda" → Tier 0 forever
         ↓
[Usa >150 calls/mes]  → recibe _quotaWarning suaves
         ↓
[Llega al 100% mensual] → tools write se bloquean → click en banner upsell
         ↓
[Aterriza en isaak.verifactu.business] → onboarding ligero (ya tiene Holded conectado)
         ↓
[Trial 14 días Isaak Pro/Starter] → tarjeta requerida o no, según conversión observada
         ↓
[Convierte] → cliente recurrente Isaak Pro €29/mes o Starter €9/mes
```

### Métricas a vigilar las primeras 8 semanas

| Métrica                                  | Objetivo realista                       | Acción si está fuera                                                                         |
| ---------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Conexiones MCP totales                   | 50 mes 1 → 500 mes 3                    | <50 = mejorar marketing, posts en r/holded, LinkedIn de Verifactu                            |
| Conversion free → Isaak (cualquier tier) | 2-5%                                    | <1% = el límite es demasiado alto, bájalo a 100/mes; >10% = el límite es restrictivo, súbelo |
| LTV Isaak Pro                            | €290+ (12 meses × €29 × 70 % retention) | <€150 = problema de retención, no de adquisición                                             |
| CAC efectivo del MCP                     | <€2/cliente Isaak                       | El MCP es esencialmente CAC gratuito; si sube, es por costes Anthropic Directory submission  |
| Net revenue mes 6                        | €500-2000/mes                           | <€500 = el funnel no funciona, repensar Tier 0                                               |

---

## Implementación técnica del límite (concreta)

### 1. Tabla `holded_mcp_quota` en Postgres

```sql
CREATE TABLE holded_mcp_quota (
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,                -- formato YYYY-MM
  tool_calls INT DEFAULT 0,
  draft_invoices INT DEFAULT 0,
  pdfs INT DEFAULT 0,
  PRIMARY KEY (user_id, month)
);
```

`user_id` se obtiene del `TokenRecord` que ya carga `requireAuth` middleware.

### 2. Middleware `enforceQuota` antes de cada tool call

```ts
// apps/holded-mcp/src/middleware/quota.ts (nuevo)
export async function enforceQuota(userId: string, toolName: string) {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const row = await getOrCreateQuotaRow(userId, month);
  const limits = LIMITS_BY_TIER[await getTierForUser(userId)];

  if (row.tool_calls >= limits.totalCalls) {
    throw new QuotaExceededError('TOTAL', limits.totalCalls, row.tool_calls);
  }
  if (toolName === 'create_invoice_draft' && row.draft_invoices >= limits.draftInvoices) {
    throw new QuotaExceededError('DRAFT', limits.draftInvoices, row.draft_invoices);
  }
  if (toolName === 'get_document_pdf' && row.pdfs >= limits.pdfs) {
    throw new QuotaExceededError('PDF', limits.pdfs, row.pdfs);
  }
}

export async function recordUsage(userId: string, toolName: string) {
  // INSERT ... ON CONFLICT UPDATE +1
}
```

### 3. Wrap del registro de tools en `tools/index.ts`

```ts
// apps/holded-mcp/src/tools/index.ts
function withQuota(tool: AnyToolHandler, name: string): AnyToolHandler {
  return async (args, ctx) => {
    const userId = ctx.holdedRecord.userId;
    await enforceQuota(userId, name);
    const result = await tool(args, ctx);
    await recordUsage(userId, name);
    if (await isApproachingQuota(userId)) {
      result.content[0].text = injectQuotaWarning(result.content[0].text);
    }
    return result;
  };
}
```

### 4. Endpoint `/api/quota/[userId]` en `apps/app` para que Isaak muestre el contador

Para que el usuario vea su consumo del mes en `isaak.verifactu.business/settings/connections`.

### 5. Webhook Stripe → upgrade tier

Cuando un usuario contrata Isaak Pro/Starter desde isaak.verifactu.business, su `holded_mcp_quota` cambia a `tier=isaak_pro` y los límites desaparecen. Stripe ya está integrado en el monorepo (`STRIPE_SECRET_KEY` en variables de entorno).

---

## Coste real de mantener el Tier 0 a escala

Asumiendo límite 200 calls/mes/usuario:

| Free users activos | Calls totales/mes | Coste Vercel estimado                                                         |
| ------------------ | ----------------- | ----------------------------------------------------------------------------- |
| 100                | 20 K              | €5-10 (incluido en plan Hobby)                                                |
| 1 000              | 200 K             | €30-60 (Vercel Pro)                                                           |
| 10 000             | 2 M               | €150-300 (Plan Pro + Postgres dedicado)                                       |
| 50 000             | 10 M              | €500-1 000 (necesitas review de arquitectura — caching agresivo de catálogos) |

**Punto de equilibrio sostenible:** con conversion 3% y ARPU €20/mes, basta con que de cada 1 000 free users te conviertas 30 a Isaak para tener €600/mes — más que cubre la infra de los 1 000 free.

---

## Riesgos y mitigaciones

| Riesgo                                                                | Mitigación                                                                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic rechaza el conector si detecta "intento de upsell agresivo" | Los `_quotaWarning` deben ser informativos, no bloqueantes hasta el 100 %. Lectura siempre disponible. La política de Anthropic acepta freemium siempre que el plan free sea funcional. |
| Holded ve el conector como competencia                                | Imposible si lo enmarcas como "complemento gratuito que prepara al usuario para Isaak, que es ERP-extensión". Tu contrato Solution Partner te respalda.                                 |
| Usuario abusa con múltiples cuentas Holded para resetear cuota        | Quota por `holded_account_id` (extraído del primer `list_*` call), no solo por `user_id`. Una API key Holded = una cuota.                                                               |
| Soporte gratis sobrepasa coste                                        | Soporte Tier 0 es solo email comunidad; auto-respondedor con link a docs+FAQ. Si el ticket es complejo, mensaje "para soporte priorizado, prueba Isaak Pro".                            |
| Cold start Vercel ahuyenta usuarios                                   | `min_instances=1` cuesta ~€5/mes y elimina el problema. Recuperable con 1 sola conversión Isaak Starter.                                                                                |

---

## Calendario sugerido

| Semana     | Acción                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0 (mañana) | Lanzar conector MCP en Anthropic Connectors Directory + landing pública (botón "Conectar con Claude"). Sin límites todavía. |
| 1-2        | Recolectar datos: cuántas conexiones, qué tools se usan, latencia, errores. NO meter límites todavía.                       |
| 3          | Implementar middleware `enforceQuota` en modo "shadow" (cuenta pero no bloquea). Telemetría real del consumo.               |
| 4          | Activar `_quotaWarning` blando al 90 %. Soft launch del banner upsell.                                                      |
| 6          | Activar bloqueo duro al 100 % en `create_invoice_draft` y `get_document_pdf`. Lectura sigue libre.                          |
| 8          | Revisar conversion rate. Ajustar límites si <2 % o >10 %.                                                                   |
| 12         | Evaluar plan: ¿bajar límite a 100/mes para forzar más conversión? ¿subir a 500/mes para más adopción? Datos manda.          |

---

## Recomendación final

**Lanza mañana sin límites.** No intentes hacer todo al día 1. La fase de adquisición es más valiosa que la de monetización los primeros 60 días — te enseña qué tools usa la gente, qué dudas tienen, qué falla. Mientras tanto, el banner footer del conector MCP y de la landing pueden invitar siempre a "Si quieres más, prueba Isaak en isaak.verifactu.business" — eso ya es marketing pasivo sin imponer límites.

A los 30 días, con datos reales, decides si el límite es 100, 200 o 500 calls/mes. Si la conversion natural es 2-3 % sin límite, considera mantenerlo como "gift to the community" y monetizar solo Isaak — eso te ahorra desarrollar middleware quota.

**Lo que es no negociable:** desde el día 1, el footer y los warnings deben mencionar Isaak con UTM tracking. Aunque el MCP sea gratis sin límites por ahora, ya estás canalizando tráfico hacia Isaak desde el minuto uno.
