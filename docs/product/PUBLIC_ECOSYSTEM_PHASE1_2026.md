# Fase 1 publica del ecosistema Verifactu Business

Fecha: 2026-04-30

## Decision canonica

La Fase 1 publica del ecosistema queda organizada asi:

- `verifactu.business` -> hub principal de entrada, posicionamiento, modo Excel, asesorias y acceso al ecosistema.
- `isaak.verifactu.business` -> producto principal y orquestador empresarial.
- `holded.verifactu.business` -> primer hub vertical de conectores, centrado en Holded.

Los tres dominios comparten backend y plataforma, pero no deben mezclarse en narrativa publica, metadatos, claims ni rutas de entrada.

## Rol publico por dominio

### 1. `verifactu.business`

Rol: hub principal.

Debe explicar:

- que es Verifactu Business
- que es Isaak
- que existe un modo Excel / in-house
- que existen conectores verticales
- que asesorias y pymes pueden entrar sin migracion total

Rutas publicas base de Fase 1:

- `/`
- `/modo-excel`
- `/asesorias`
- `/conectores`

### 2. `isaak.verifactu.business`

Rol: producto principal.

Isaak se presenta como:

- orquestador empresarial
- capa inteligente por encima de ERP, Excel, documentos y herramientas de negocio
- sistema con permisos, control y trazabilidad
- producto que puede empezar con Excel y escalar despues a conectores

Rutas publicas base de Fase 1:

- `/`
- `/modos/excel`
- `/conectores`
- `/asesorias`

### 3. `holded.verifactu.business`

Rol: hub vertical de conectores para Holded.

La raiz `/` sigue congelada mientras exista sensibilidad por review publica y compatibilidad historica.

La capa segura publicada en Fase 1 vive bajo `/conectores`:

- `/conectores`
- `/conectores/docs`
- `/conectores/privacy`
- `/conectores/dpa`
- `/conectores/soporte`
- `/conectores/chatgpt`
- `/conectores/chatgpt/docs`
- `/conectores/chatgpt/privacy`
- `/conectores/chatgpt/dpa`
- `/conectores/chatgpt/soporte`
- `/conectores/claude`
- `/conectores/claude/docs`
- `/conectores/claude/privacy`
- `/conectores/claude/dpa`
- `/conectores/claude/soporte`

## Reglas de no ruptura

- No tocar `/.well-known/*`.
- No tocar `/oauth/authorize`, `/oauth/token`, `/oauth/register`.
- No tocar `/api/mcp/holded` dentro de este trabajo de posicionamiento publico.
- No convertir `app.verifactu.business` en cara publica de conectores.
- No presentar a Isaak como conector ni a Holded como producto principal del ecosistema.

## Mensajes publicos aprobados

### Verifactu Business

- hub principal
- cumplimiento, conectividad y comprension empresarial
- entrada calmada para pymes y asesorias

### Isaak

- orquestador empresarial
- no es otro ERP
- habla con tu empresa, entiende tus datos, ejecuta con control

### Holded

- primer hub vertical de conectores
- integracion independiente sobre API de Holded
- no afiliado a Holded, OpenAI ni Anthropic

## Estado de implementacion

Implementado en esta fase:

- nuevo home y paginas publicas base en `apps/landing`
- nuevo posicionamiento publico de `apps/isaak`
- hub seguro de conectores y paginas agregadoras en `apps/holded` bajo `/conectores`
- navegacion publica alineada con esta separacion

Pendiente para fases posteriores:

- revisar root de `holded.verifactu.business` cuando el contexto de revision publica deje de bloquearlo
- ampliar conectores mas alla de Holded
- consolidar casos de uso y pricing publico por segmento
