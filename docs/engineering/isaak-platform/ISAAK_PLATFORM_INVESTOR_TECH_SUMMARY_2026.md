# Isaak Platform — Resumen Técnico para Inversores

**Fecha:** 2026-05-01  
**Audiencia:** Inversores, due diligence técnica  
**Nivel:** No técnico / resumen ejecutivo

---

## ¿Qué es Isaak Platform?

Isaak Platform es la infraestructura que convierte **Isaak** —nuestro asistente fiscal con IA— en una plataforma abierta sobre la que pueden construir terceros: asesorías, despachos, ERPs y otros socios.

Tiene dos componentes principales:

### 1. Isaak MCP Server

Permite que asistentes de IA de terceros (Claude de Anthropic, ChatGPT de OpenAI) actúen como Isaak de forma segura dentro de los flujos de trabajo de nuestros clientes.

**En la práctica:** un contable puede abrir Claude, conectarlo a su empresa en Isaak, y pedirle que le explique el estado de sus facturas, valide una factura antes de enviarla a Hacienda, o le avise de próximos vencimientos fiscales — todo sin salir de la interfaz de IA que ya usa.

### 2. Isaak API v1

Una API REST estándar que permite a cualquier socio (ERP, despacho, integrador) conectarse a Isaak de forma programática con sus propias aplicaciones.

**En la práctica:** una asesoría que gestiona 200 clientes puede integrar Isaak en su propio software interno para, con una llamada a la API, saber el estado fiscal de cada cliente, crear facturas, o consultar el historial de envíos a Hacienda.

---

## ¿Por qué esto importa para el negocio?

### Efecto red y stickiness

Cuando un ERP o despacho integra Isaak en su flujo de trabajo, la dependencia no es solo del usuario final — es de toda la organización. Esto multiplica el coste de cambio y reduce el churn.

### Nueva línea de revenue

La API v1 para partners se comercializa con precios por volumen de llamadas, por encima del plan base de Isaak. Cada integrador que construye sobre Isaak es un canal de distribución que no requiere inversión en ventas directa.

### Posicionamiento como plataforma fiscal

El mercado de automatización fiscal en España tiene una oportunidad concreta: VeriFactu (obligatorio para empresas en 2026-2027) obliga a integrar con la AEAT. Isaak ya tiene esa infraestructura. La API hace que otros puedan beneficiarse de ella sin tener que construirla desde cero.

### Datos y diferenciación

Cada integración que pasa por Isaak enriquece los datos con los que entrenamos y mejoramos el asistente. Esto crea un ciclo virtuoso: más integraciones → mejores datos → mejor IA → más integraciones.

---

## ¿Cómo funciona técnicamente? (Versión simplificada)

```
┌─────────────────────────────────┐
│  Claude  │  ChatGPT  │  Partner │
└────────────────────┬────────────┘
                     │
           ┌─────────▼─────────┐
           │   Isaak Platform   │
           │  (API v1 + MCP)    │
           └─────────┬─────────┘
                     │
           ┌─────────▼─────────┐
           │   Motor Isaak      │
           │  (IA + VeriFactu)  │
           └─────────┬─────────┘
                     │
           ┌─────────▼─────────┐
           │  AEAT / Hacienda   │
           └───────────────────┘
```

- Los asistentes de IA (Claude, ChatGPT) se conectan a través de **MCP** (Model Context Protocol), el estándar abierto de Anthropic para conectar IAs con servicios externos
- Los socios tecnológicos se conectan a través de la **API REST v1**, igual que se haría con Stripe o cualquier API moderna
- Toda comunicación con Hacienda pasa por la capa de VeriFactu que Isaak ya tiene en producción

---

## Seguridad y cumplimiento

Dos aspectos críticos para due diligence:

### Datos fiscales y aislamiento

- Cada empresa tiene sus datos completamente aislados de los demás — imposible que un socio acceda a datos de otro cliente
- Los datos no salen de nuestros servidores hacia los modelos de IA (los modelos solo leen lo que Isaak les envía explícitamente)

### VeriFactu es irreversible

Enviar una factura a Hacienda no puede deshacerse. El sistema requiere **confirmación explícita** del usuario humano antes de ejecutar cualquier envío — incluso si la instrucción viene de un asistente de IA. Esto garantiza que el humano siempre está en el loop para decisiones fiscales críticas.

### Auditoría completa

Cada acción realizada a través de la plataforma (quién, qué, cuándo, desde qué canal) queda registrada y es recuperable para auditorías fiscales o legales. Los registros se conservan 7 años conforme a la normativa española.

---

## Estado actual y hoja de ruta

| Fase                                            | Estado                       | Fecha estimada |
| ----------------------------------------------- | ---------------------------- | -------------- |
| Infraestructura VeriFactu (SOAP AEAT)           | ✅ En producción             | 2025           |
| Isaak UI + asistente de chat                    | ✅ En producción             | 2026 Q1        |
| Isaak MCP (Claude + ChatGPT)                    | ✅ Conector Holded operativo | 2026 Q1        |
| Isaak Platform Fase 0 (diseño y especificación) | ✅ Completado                | 2026-05        |
| Isaak Platform Fase 1 (servicios compartidos)   | 🔲 Planificado               | 2026 Q2        |
| Isaak API v1 (cookie auth)                      | 🔲 Planificado               | 2026 Q2        |
| Isaak MCP Server propio                         | 🔲 Planificado               | 2026 Q2        |
| Isaak API v1 (partner keys, beta)               | 🔲 Planificado               | 2026 Q3        |
| Portal público para desarrolladores             | 🔲 Planificado               | 2026 Q4        |

---

## Diferenciadores técnicos

| Factor                        | Isaak Platform                 | Alternativa típica                     |
| ----------------------------- | ------------------------------ | -------------------------------------- |
| VeriFactu integrado           | Nativo — ya en producción      | Requiere integración propia            |
| Soporte MCP (estándar IA)     | Sí — dos conectores operativos | No existe en el mercado fiscal español |
| Confirmación humana para AEAT | Diseñada desde el origen       | No aplica / no tienen                  |
| Multi-tenant desde diseño     | Sí                             | Muchos actores son mono-empresa        |
| Audit log fiscal 7 años       | Incluido                       | Extra en la mayoría de competidores    |

---

## Riesgos conocidos y mitigaciones

| Riesgo                              | Mitigación                                                                |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Adopción de partners lenta          | Beta cerrada con 3-5 asesorías conocidas antes del lanzamiento público    |
| Cambios en VeriFactu por AEAT       | Capa de abstracción: la API no expone el protocolo SOAP directamente      |
| Competencia de ERP grandes          | Nos enfocamos en el segmento SMB y autónomos — fuera del foco de SAP/Sage |
| Cambios en MCP (estándar Anthropic) | Seguimos el estándar oficial; Anthropic es partner activo                 |
| Seguridad / brecha de datos         | Penetration test planificado antes de la apertura pública (Fase 5)        |

---

## Documentación técnica completa

Para due diligence técnica detallada:

- `ISAAK_MCP_API_AUDIT_2026.md` — mapa de servicios existentes
- `ISAAK_MCP_API_IMPLEMENTATION_PLAN_2026.md` — plan de 5 fases
- `ISAAK_MCP_SERVER_SPEC_2026.md` — especificación completa del servidor MCP
- `ISAAK_PLATFORM_API_V1_SPEC_2026.md` — especificación REST API v1
- `ISAAK_PLATFORM_SECURITY_MODEL_2026.md` — modelo de seguridad
- `openapi/isaak-platform-api-v1.yaml` — especificación OpenAPI 3.1
