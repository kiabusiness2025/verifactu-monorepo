# ISAAK — Visión de Producto

> ⚠️ **V1 LAUNCH (2026-05-28)** — pricing simplificado a **Free + Pro 29 €/mes** (290 €/año con 2 meses gratis). Trial Pro de 14 días sin tarjeta. Planes legacy Starter/Pro 49/Business 149 archivados. Fuente única del lanzamiento: [`ISAAK_LAUNCH_V1_2026-05-28.md`](../product/ISAAK_LAUNCH_V1_2026-05-28.md). El pricing y los planes de este documento histórico están **deprecated**.

> Última actualización: 2026-04-28 · Arquitecto responsable: Verifactu Business

---

## North Star

**Isaak no es un chatbot. Es el CFO/controller digital de la pyme española.**

El usuario abre Isaak, habla con su negocio en lenguaje natural, y Isaak actúa: analiza, alerta, contabiliza, recuerda, prepara documentos y concilia. El software de gestión (Holded, Sage, A3…) es el origen de datos; Isaak es la inteligencia que lo convierte en decisiones.

**Métrica estrella:** minutos ahorrados por usuario por semana.

---

## Problema que resolvemos

Las pymes españolas tienen sus datos en un ERP (Holded, Sage, A3, Contaplus…) pero no saben qué hacer con ellos. Contratar un controller o CFO externo cuesta €2.000–€6.000/mes. Los gestores/asesores facturan por hora y no están disponibles cuando se necesita. El ERP por sí solo no interpreta, no alerta, no recomienda.

Resultado: el empresario toma decisiones financieras a ciegas, tarde o dependiendo de terceros.

---

## Propuesta de valor

| Sin Isaak                                         | Con Isaak                                           |
| ------------------------------------------------- | --------------------------------------------------- |
| Abres el ERP y no sabes qué mirar                 | Isaak te dice qué revisar hoy y por qué             |
| Llamas al gestor para entender el IVA             | Le preguntas a Isaak en 10 segundos                 |
| Las facturas vencidas pasan desapercibidas        | Alerta automática con contexto del cliente          |
| Contabilizas facturas recibidas manualmente       | Isaak las lee, extrae datos y las propone en Holded |
| No sabes si podrás pagar nóminas el mes que viene | Previsión de tesorería en tiempo real               |

---

## Posicionamiento

**Isaak es a la gestión empresarial lo que Copilot es al código:**  
un co-piloto que conoce tu negocio, trabaja a tu lado y actúa cuando le pides.

- No sustituye al gestor/asesor — le da contexto de calidad para trabajar mejor
- No sustituye al ERP — lo hace útil para quien no es contable
- No es ChatGPT genérico — está especializado en gestión de pymes españolas

---

## Usuarios objetivo

### Primario: autónomo o pyme 1–15 empleados

- Usa Holded (o similar)
- No tiene controller interno
- Quiere entender sus números sin depender del gestor para cada duda
- Presupuesto: €29–€99/mes es asumible si hay ROI claro

### Secundario: gestor / asesoría con múltiples clientes

- Usa Isaak para gestionar varios clientes desde un panel
- Necesita alertas automáticas por cliente
- Plan Business (Modo Asesoría ✅)

### Terciario: CFO o director financiero de pyme mediana

- 15–100 empleados, ERP propio, equipo de administración pequeño
- Necesita dashboards, conciliación bancaria, análisis predictivo
- Plan Business

---

## Diferenciadores competitivos

1. **Especialización Holded** — somos el conector más completo del mercado español para Holded
2. **Dual AI (Claude + GPT-4o)** — usamos el mejor modelo para cada tarea, no nos atamos a uno
3. **Ciclo completo** — del chat al dashboard, al OCR, al banco, a los documentos fiscales
4. **En español** — UX, prompts, alertas y documentos en español castellano por defecto
5. **Multi-ERP** — arquitectura diseñada para conectar cualquier ERP desde el primer día
6. **Isaak como marca** — personalidad, consistencia, confianza (vs. "IA genérica")

---

## Competencia

| Producto                  | Qué hace                       | Por qué Isaak gana                                             |
| ------------------------- | ------------------------------ | -------------------------------------------------------------- |
| ChatGPT + conector Holded | Chat genérico con datos Holded | Isaak es especializado, proactivo, incluye dashboard y alertas |
| Holded nativo             | ERP completo                   | No interpreta, no alerta, no habla                             |
| Sage Copilot              | IA de Sage (Beta)              | Solo para Sage, sin OCR ni banco                               |
| Indy / Declarando         | Facturación y fiscal autónomo  | Solo autónomos, no ERP                                         |
| Dext / AutoEntry          | OCR de facturas                | Solo OCR, sin IA conversacional ni ERP                         |

---

## Evolución del producto (resumen de fases)

```
Fase 1  →  Chat + Holded + Dashboard básico + alertas           [LANZAMIENTO]
Fase 2  →  Calendar + Email + notificaciones inteligentes        [+2 meses]
Fase 3  →  OCR automático + inbox facturas + multi-ERP           [+4 meses]
Fase 4  →  Voz + documentos mercantiles + modelos fiscales       [+6 meses]
Fase 5  →  Banca PSD2 + conciliación + previsión tesorería       [+9 meses]
```

Ver detalle en `ISAAK_ROADMAP.md`.

---

## Modelo de negocio

SaaS mensual/anual con 30 días de trial completo (plan Pro).

```
Starter   €29/mes  →  pymes pequeñas, 1 ERP, chat + dashboard
Pro       €69/mes  →  email + calendar + OCR + voz
Business  €149/mes →  banking + multi-ERP + equipo + documentos
Business    €149/mes →  multi-usuario, banking, AEAT
```

Ver detalle en `ISAAK_SUBSCRIPTION_MODEL.md`.

---

## Principios de diseño del producto

1. **El usuario aprueba, Isaak propone** — nunca modificar datos sin confirmación explícita
2. **Proactividad, no reactividad** — Isaak avisa antes de que el usuario pregunte
3. **Español natural, sin jerga** — las respuestas son para empresarios, no para contables
4. **Transparencia de IA** — siempre se indica qué motor respondió y con qué datos
5. **Privacidad por diseño** — los datos del ERP no se almacenan en abierto, TTL corto en caché
