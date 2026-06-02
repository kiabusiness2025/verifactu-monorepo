# Isaak — Plan de Lanzamiento V1

> **Fecha**: 2026-05-28
> **Autor**: producto + ingeniería (sesión de planificación)
> **Estado**: aprobado para V1 — Sprint A arrancado el 2026-06-02
> **Reemplaza**: secciones de roadmap en `docs/product/ISAAK_MASTER_PLAN.md` y `docs/engineering/ISAAK_MASTER_PLAN.md` durante el periodo V1. El Master Plan original queda como referencia para el roadmap V2+.

---

## 1. Resumen ejecutivo

**Isaak V1 = asistente fiscal con IA integrada que se conecta a Holded en 30 segundos**.

El cliente paga una suscripción única (29 €/mes). No necesita Claude / ChatGPT propios — la IA va incluida. No necesita gestoría — Isaak conoce el corpus completo de Agencia Tributaria.

**Diferencial respecto al estado actual de Isaak (mayo 2026)**: hoy Isaak tiene 22 entradas en el sidebar y demasiada superficie. V1 reduce a **4 entradas** y un único caso de uso (chat con Holded + alertas), escondiendo el resto bajo feature flag — el código queda intacto para reactivarse en V2 sin re-trabajo.

**Actualización 2026-06-02**: este documento es la fuente de verdad operativa para V1. El plan maestro de ingeniería conserva el backlog V2+ como referencia, pero el trabajo activo queda centrado en Sprint A/B/C de este plan.

---

## 2. Decisiones de scope (cerradas)

| #   | Decisión               | Detalle                                                                                                                                         |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Producto V1**        | App web `isaak.verifactu.business`. Conectores Claude / ChatGPT son canales paralelos, **no se tocan** (siguen en revisión Anthropic / OpenAI). |
| 2   | **Marca**              | "Isaak" se mantiene. Tagline: _"Tu asistente fiscal para Holded. Sin licencias IA."_                                                            |
| 3   | **Motor IA interno**   | Claude Sonnet (Anthropic) primario + GPT-4o (OpenAI) fallback. Transparente al usuario.                                                         |
| 4   | **Free**               | Chat **ilimitado** con corpus AEAT. Sin Holded. Estrategia: funnel de aprendizaje para entrenar Isaak.                                          |
| 5   | **Pro**                | 29 €/mes · 290 €/año (-20%). Holded conectado + tools + alertas.                                                                                |
| 6   | **Trial**              | 14 días Pro sin tarjeta. Conversión automática al final si paga.                                                                                |
| 7   | **Funcionalidad core** | Chat con tools Holded · Corpus AEAT en system prompt · Alertas D-15/7/3/1 de vencimientos 303/130.                                              |
| 8   | **Verifactu emisión**  | **Escondida**. Holded ya lo tiene. Isaak genera **borradores** via tools API Holded.                                                            |
| 9   | **Tools Holded**       | Cobertura máxima en **invoicing + contabilidad**. CRM / stock / warehouses / time-records fuera de V1.                                          |
| 10  | **Landing**            | `verifactu.business` rediseñada **como Hub** de los 3 productos. `isaak.verifactu.business` como landing dedicada del producto Isaak.           |

---

## 3. Surface UI V1

### Sidebar — de 22 entradas a 4

| Entrada        | Ruta        | Contenido                                                               |
| -------------- | ----------- | ----------------------------------------------------------------------- |
| **🗨️ Chat**    | `/chat`     | Home. Chat con datos Holded + corpus AEAT. Pregunta sugerida inicial.   |
| **📊 Resumen** | `/resumen`  | Cards del trimestre: ventas, gastos, IVA estimado, próximo vencimiento. |
| **🔔 Alertas** | `/alertas`  | Listado de alertas fiscales activas (vencimientos próximos). Histórico. |
| **⚙️ Ajustes** | `/settings` | Perfil · Empresa · Holded (API key) · Plan & billing.                   |

Todas las demás entradas actuales (Banking, Mail, Calendario, WhatsApp, Microsoft 365, Modelos AEAT, Auditoría, Inspector AEAT, Buzón Sede, Perfil fiscal, Contactos, Equipo, Modo Asesoría, Corpus AEAT admin, Personalizar Isaak) **se ocultan por feature flag `ISAAK_V1_LAUNCH=true`**. El código queda intacto.

### Onboarding — 1 paso

```
Signup (email + Google)
  └─ Conecta Holded (pega API key)
     └─ Verificación instantánea → Chat con primera pregunta sugerida
```

---

## 4. Funcionalidad detallada

### 4.1 Chat con Holded (tools)

**Tools ya implementadas en `apps/isaak/app/lib/holded-tools.ts` (17)**:
`holded_list_documents`, `holded_get_document`, `holded_list_contacts`, `holded_get_contact`, `holded_get_chart_of_accounts`, `holded_get_journal`, `holded_list_treasury_accounts`, `holded_list_products`, `holded_list_projects`, `holded_list_employees`, `holded_get_verifactu_status`, `holded_get_pnl`, `holded_list_payments`, `holded_create_invoice`, `holded_register_payment`, `holded_create_contact`, `holded_send_document`.

**Tools a añadir en V1 (5 nuevas, portadas desde `apps/holded-mcp`)**:

1. `holded_list_taxes` — impuestos disponibles en el ERP (crítico fiscal)
2. `holded_list_numbering_series` — series correlativas (necesario para crear facturas)
3. `holded_get_document_pdf` — devolver PDF al usuario via chat
4. `holded_get_daily_book` — libro diario contable
5. `holded_create_invoice_draft` — **reemplaza** `holded_create_invoice` (crea borrador, NO emite directo)

**Total tools V1: 21 (17 existentes + 5 nuevas, -1 reemplazada)**.

**Tools fuera de V1 (existen en MCP pero no se portan)**: `list_crm_funnels`, `list_leads`, `list_products_stock`, `list_warehouses`, `list_time_records`, `list_project_tasks`. Razón: no son "invoicing y contabilidad", saturan el contexto del LLM.

### 4.2 Corpus AEAT en system prompt

Infraestructura existente:

- Cron `aeat-corpus-reingest` (ya activo)
- Cron `aeat-sede-sync` (ya activo)
- Página admin `/sede-corpus`

**Acción V1**: verificar que el corpus está correctamente inyectado en el system prompt del chat (tarea Sprint B). Test smoke: preguntas tipo _"¿cuál es el plazo del 303 del Q2 2026?"_, _"¿qué deduce el régimen simplificado?"_. Debe responder con datos AEAT correctos sin alucinaciones.

### 4.3 Alertas fiscales D-15/7/3/1

Cron `fiscal-alerts` ya existe. Envía email vía Resend para los vencimientos del modelo 303 y 130 a:

- D-15: aviso temprano
- D-7: recordatorio
- D-3: urgente
- D-1: último recordatorio

**Acción V1**: confirmar que el flujo end-to-end funciona con un tenant Pro real. Validar plantillas HTML del email.

### 4.4 Resumen — vista simplificada

Página `/resumen` con 4 cards horizontales:

1. **Ventas mes** (importe + variación vs mes previo)
2. **Gastos mes** (importe + variación)
3. **IVA estimado del trimestre** (casillas 303 pre-calculadas, sin emitir)
4. **Próximo vencimiento** (modelo + fecha + días restantes)

Sin gráficos complejos en V1. Si el cliente quiere más, abre el chat y pregunta.

---

## 5. Pricing V1

| Plan     | Mensual      | Anual                | Incluye                                                                  |
| -------- | ------------ | -------------------- | ------------------------------------------------------------------------ |
| **Free** | 0 €          | —                    | Chat ilimitado · Corpus AEAT completo · Sin Holded                       |
| **Pro**  | **29 €/mes** | **290 €/año** (-20%) | Todo Free + Holded conectado + 21 tools API + alertas D-15/7/3/1 + email |

**Trial Pro**: 14 días sin tarjeta. Stripe trial mode con conversión opt-in.

**Add-ons V1**: ninguno. Mantener simple. Add-ons (usuario adicional, ERP adicional) llegan en V2.

**Stripe products**:

- Crear nuevos products `isaak_pro_monthly` (29 €) y `isaak_pro_annual` (290 €).
- Los 4 productos actuales (Free / Starter / Pro / Business) quedan archivados pero no eliminados — si algún cliente legacy los tiene, su suscripción persiste hasta cancelación.

---

## 6. Funnel V1

```
verifactu.business (Hub)
  └─ Card "Isaak" → isaak.verifactu.business
     │
     ├─ Visitante explora landing producto
     │   └─ CTA: "Probar 14 días gratis"
     │
     └─ Signup (email + Google)
        └─ Onboarding 1 paso (conectar Holded)
           └─ Chat con pregunta sugerida
              ├─ Día 0-13: trial Pro activo, full features
              └─ Día 14: conversión opt-in (sin auto-cobro)
                 ├─ Pago → continúa Pro
                 └─ No paga → cuenta cae a Free (ilimitado, sin Holded)
```

---

## 7. Landing Hub + landing Isaak

### `verifactu.business` (Hub) — **rehacer desde cero**

Estructura propuesta:

1. **Hero**: "Verifactu Business — La forma más simple de cumplir y crecer"
2. **3 cards productos** lado a lado:
   - **Isaak** → asistente fiscal para Holded (de pago, IA incluida)
   - **Conector Claude** → Holded × Claude.ai (gratis, requiere Claude Pro)
   - **Conector ChatGPT** → Holded × ChatGPT (gratis, requiere ChatGPT Plus)
3. **Sección "¿Por qué Verifactu?"**: 4 value props comunes
4. **Footer**: legal, contacto, prensa, GitHub

### `isaak.verifactu.business` (landing producto)

Estructura:

1. **Hero**: "Tu asistente fiscal para Holded. Sin licencias IA."
2. **3 beneficios**:
   - "Habla con tu Holded en español"
   - "Recibe alertas antes de cada vencimiento"
   - "Conoce el corpus completo de la Agencia Tributaria"
3. **Demo video 60 s**
4. **Pricing 2 planes** (Free / Pro)
5. **FAQ** (10 preguntas)
6. **CTA final**: "Probar 14 días gratis"

### Landings Claude / ChatGPT (sin rediseño)

Ya existen en `holded.verifactu.business`. Pequeño ajuste de header para apuntar al Hub.

---

## 8. Plan de implementación — 3 sprints

### Sprint A — Esconder (1-2 días · 1 dev)

| ID  | Tarea                                                                                                                                                                                                    | Estado 2026-06-02                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| A1  | Helper `lib/feature-flags.ts` + env `ISAAK_V1_LAUNCH=true`                                                                                                                                               | Hecho; env prod confirmado en true |
| A2  | `IsaakSidebar.tsx` reducido a 4 entradas si flag activo                                                                                                                                                  | Hecho                              |
| A3  | `IsaakBottomNav.tsx` reducido en móvil                                                                                                                                                                   | Hecho                              |
| A4  | `/integrations` muestra solo Holded + sección "Próximamente"                                                                                                                                             | Hecho                              |
| A5  | Esconder página `/verifactu` (si existe) y mantener emision UI fuera de V1                                                                                                                               | Cubierto por guard V1              |
| A6  | Esconder páginas: `/banking`, `/mail`, `/calendario`, `/whatsapp`, `/microsoft`, `/fiscal/*`, `/auditoria`, `/inspector`, `/sede`, `/perfil-fiscal`, `/contactos`, `/equipo`, `/advisor`, `/sede-corpus` | Hecho por middleware V1            |
| A7  | Onboarding: skip steps de Google/WhatsApp/Microsoft si flag                                                                                                                                              | Hecho; V1 deja solo Holded         |
| A8  | Smoke test: sidebar + onboarding + chat siguen funcionando con flag activo                                                                                                                               | Pendiente de smoke final           |

### Sprint B — Pulir core (3-5 días · 1 dev)

| ID  | Tarea                                                                                                                      | Estado 2026-06-02                           |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| B1  | Verificar corpus AEAT en system prompt (test con 10 preguntas tipo)                                                        | Hecho; test automático cubre 10 temas AEAT  |
| B2  | Portar 5 tools nuevas: `list_taxes`, `list_numbering_series`, `get_document_pdf`, `get_daily_book`, `create_invoice_draft` | Hecho en código                             |
| B3  | Reemplazar `holded_create_invoice` por `holded_create_invoice_draft` en system prompt + naming                             | Hecho; draft-only y confirmación explícita  |
| B4  | Confirmar cron `fiscal-alerts` end-to-end con tenant real (D-15 → email)                                                   | Pendiente                                   |
| B5  | `/resumen` simplificado: 4 cards (ventas, gastos, IVA, próx. vencimiento)                                                  | Hecho; V1 oculta gráficos/banking/Verifactu |
| B6  | `/alertas` simplificado: listado activas + histórico                                                                       | Hecho en código                             |
| B7  | Onboarding Holded: copy + validación + manejo errores                                                                      | Pendiente                                   |
| B8  | Stripe products nuevos (`isaak_pro_monthly`, `isaak_pro_annual`)                                                           | Pendiente                                   |
| B9  | Trial 14 días sin tarjeta: lógica + webhook trial end                                                                      | Pendiente                                   |

### Sprint C — Hub + landing + lanzamiento (3-4 días · 1 dev + 1 diseño)

| ID  | Tarea                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- |
| C1  | `verifactu.business` Hub: rediseño completo (Hero + 3 cards + valor + footer)                        |
| C2  | `isaak.verifactu.business`: nueva landing producto (Hero + beneficios + video + pricing + FAQ + CTA) |
| C3  | Video demo 60 s grabado y editado                                                                    |
| C4  | Ajuste header landings Claude / ChatGPT para apuntar al Hub                                          |
| C5  | Email lanzamiento (Resend campaign) a base actual                                                    |
| C6  | Email bienvenida + email pre-vencimiento (templates Resend)                                          |
| C7  | Smoke test E2E completo: signup → Holded → chat → resumen → alerta                                   |
| C8  | Habilitar `ISAAK_V1_LAUNCH=true` en Vercel prod                                                      |
| C9  | Anuncio LinkedIn / Twitter / comunidades Holded                                                      |

**Estimación total**: 7-11 días (1-2 semanas de calendario con 1 dev FT).

---

## 9. Métricas de éxito V1

### Primeros 30 días post-lanzamiento

| Métrica                       | Target        | Cómo se mide                          |
| ----------------------------- | ------------- | ------------------------------------- |
| Signups Free                  | 800           | Stripe + Firebase Auth                |
| Signups Pro (trial)           | 200           | Stripe trials                         |
| Activación (Holded conectado) | 60% de trials | `IsaakOnboarding.holded_connected_at` |
| DAU sobre activados           | 30%           | Analytics                             |
| Conversión trial → Pro        | 15%           | Stripe subscription created           |
| **MRR mes 1**                 | **≈ 870 €**   | 30 Pro × 29 €                         |
| Mensajes Free (entrenamiento) | > 10.000      | UsageEvent count                      |
| NPS día 14                    | > 30          | encuesta in-app                       |

### Métricas de aprendizaje (Free funnel)

- Cobertura de temas fiscales preguntados (top 50)
- Casos donde Isaak alucina vs. responde bien (muestreo manual semanal)
- Preguntas comunes que justifiquen una tool Holded extra en V1.1

---

## 10. Qué NO hace V1 (explícito)

- ❌ No emite facturas via UI (solo borrador via chat)
- ❌ No tiene banking ni conciliación
- ❌ No tiene multi-usuario / asesorías
- ❌ No tiene Mail / Calendar / WhatsApp / Microsoft 365
- ❌ No tiene Inspector AEAT ni Buzón Sede dedicado
- ❌ No tiene Modelos AEAT (303/130) en UI
- ❌ No tiene Modos Asesoría
- ❌ No tiene Contactos / Equipo
- ❌ No tiene integraciones sectoriales (HotelGest, Revo)
- ❌ No tiene voz / OCR / push avanzado en UI

Todo lo anterior **existe en código**, solo queda escondido por flag. Reactivación V2+ es cuestión de quitar el flag (y testear).

---

## 11. Roadmap V2+ (lo escondido, orden tentativo)

| Versión  | Funcionalidad                                                       | Cuándo se considera |
| -------- | ------------------------------------------------------------------- | ------------------- |
| **V1.1** | Verifactu emisión UI (página dedicada)                              | 4 semanas post-V1   |
| **V1.2** | Banking via Enable Banking (PSD2)                                   | 6 semanas post-V1   |
| **V1.3** | Modelos AEAT 303/130 emisión + Inspector                            | 8 semanas post-V1   |
| **V2.0** | Multi-usuario + Modo Asesoría                                       | 12 semanas post-V1  |
| **V2.1** | Google Calendar + Gmail (re-activar UI)                             | 16 semanas post-V1  |
| **V2.2** | WhatsApp + Microsoft 365 (re-activar UI)                            | 20 semanas post-V1  |
| **V3.0** | Integraciones sectoriales (HotelGest, Revo XEF, Nubimed, Inmovilla) | 6 meses post-V1     |

**Disparador para V1.1+**: 50 clientes Pro pagando consistentemente, o pedido reiterado del mismo subconjunto.

---

## 12. Riesgos y mitigaciones

| Riesgo                                                       | Probabilidad | Impacto    | Mitigación                                                                                             |
| ------------------------------------------------------------ | ------------ | ---------- | ------------------------------------------------------------------------------------------------------ |
| Free ilimitado dispara coste de Claude                       | Media        | Alto       | Cap por session (10 msg/h) + monitoring `UsageEvent` semanal · downgrade Free a Haiku puro (sin tools) |
| Corpus AEAT desactualizado tras cambios normativos           | Alta         | Medio      | Cron `aeat-corpus-reingest` semanal + alerta admin si falla                                            |
| Holded cambia su API y rompe tools                           | Baja         | Alto       | Tests contract en CI (`holded:ci:contract`) ya existentes                                              |
| Conversión trial → Pro debajo de 10%                         | Media        | Alto       | Email D-12 personalizado · Llamada manual a primeros 20 trials para feedback                           |
| Conector Claude o ChatGPT NO se aprueba                      | Baja         | Bajo en V1 | V1 no depende de ellos. Si llega aprobación, se suma al Hub como upsell.                               |
| Cliente legacy en plan Starter/Business actual queda confuso | Media        | Bajo       | Email aviso + portal sigue funcionando · plan persiste hasta cancelación voluntaria                    |

---

## 13. Decisiones reversibles vs. irreversibles

**Reversibles (cambiar sin coste)**:

- Precio Pro (Stripe permite cambios)
- Tools incluidas (añadir/quitar es código)
- Sidebar entries (flag)
- Trial días (env var)

**Irreversibles o caras de revertir**:

- Renombrar plan Pro (URL stripe + emails + landing)
- Eliminar planes Starter/Business legacy (clientes activos)
- Cambios al schema Prisma (migración)

**Decisión clave a no revertir**: el feature flag. Esconder bajo flag (no eliminar) es lo que nos permite ir rápido sin perder el trabajo V2.

---

## 14. Próximos pasos inmediatos

1. ✅ Documento aprobado
2. 🔄 Sprint A — Esconder (en curso desde 2026-06-02)
3. ⏳ Sprint B — Pulir core
4. ⏳ Sprint C — Hub + landing + launch

Cada sprint = 1 PR independiente. Mergeo entre sprints solo si A está en main antes de empezar B.

---

## Referencias

- `docs/product/ISAAK_MASTER_PLAN.md` — plan maestro previo (queda como referencia V2+)
- `docs/engineering/ISAAK_MASTER_PLAN.md` — plan maestro ingeniería
- `apps/isaak/app/lib/holded-tools.ts` — tools chat actuales
- `apps/holded-mcp/src/tools/` — tools MCP completas (referencia para portar)
- Cron list — `apps/isaak/vercel.json`
