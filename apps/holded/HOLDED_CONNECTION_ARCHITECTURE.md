# Holded Connection Architecture

## Vision general

El conector ChatGPT <-> Holded expone una superficie publica en `holded.verifactu.business` y reutiliza `apps/app` solo como backend compartido.

```text
ChatGPT
  |
  | MCP JSON-RPC + Bearer token
  v
https://holded.verifactu.business/api/mcp/holded
  |  superficie publica canonica
  v
apps/app backend compartido
  |  runtime MCP real + OAuth + persistencia
  v
api.holded.com
```

## Regla de arquitectura

- `apps/holded`: dominio publico del conector
- `apps/app`: backend compartido, OAuth server, userinfo, persistencia y panel admin
- `apps/isaak`: fuera del flujo publico del conector

## Dominios y responsabilidades

| Dominio                     | Rol                                                 |
| --------------------------- | --------------------------------------------------- |
| `holded.verifactu.business` | cara publica del conector para ChatGPT y el usuario |
| `app.verifactu.business`    | backend compartido interno del monorepo             |

## Superficie publica canonica

### MCP

- `https://holded.verifactu.business/api/mcp/holded`

### OAuth publico

- `https://holded.verifactu.business/oauth/authorize`
- `https://holded.verifactu.business/oauth/token`
- `https://holded.verifactu.business/oauth/register`
- `https://holded.verifactu.business/.well-known/oauth-authorization-server`
- `https://holded.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded`
- `https://holded.verifactu.business/.well-known/openid-configuration`
- `https://holded.verifactu.business/.well-known/openai-apps-challenge`

## Flujo Fase I

Contrato actual:

1. ChatGPT entra por OAuth en `holded.verifactu.business`
2. Si no hay sesion, el usuario hace login en `apps/holded`
3. El usuario pega su API key de Holded
4. El backend compartido valida y guarda la conexion
5. El flujo vuelve a ChatGPT

Forma corta:

- `OAuth -> API key -> ChatGPT`

## Backend compartido

`apps/app` sigue alojando:

- runtime MCP real
- logica OAuth
- `userinfo`
- BD
- auditoria
- panel admin del conector

Pero el navegador no debe depender de `app.verifactu.business` como cara publica del conector.

## Proxies y comportamiento esperado

### `/holded`

- `/oauth/authorize`: proxy transparente al backend compartido
- `/oauth/token`: proxy HTTP al backend compartido
- `/oauth/register`: proxy HTTP al backend compartido
- `/api/mcp/holded`: proxy transparente al runtime MCP real

### `apps/app`

Mantiene:

- `oauth/authorize`
- `oauth/token`
- `oauth/register`
- `oauth/userinfo`
- `api/mcp/holded`

Como backend compartido, no como superficie publica canonica del conector.

## Reglas de Fase I

- no exponer Isaak en la experiencia publica del conector
- no mandar al usuario a un onboarding largo
- no pedir datos de empresa no esenciales para completar la conexion
- mantener emails de connect/disconnect
- conservar historico para admin
- resetear memoria y sesiones al desconectar

## Panel admin

Ruta canonica privada:

- `/dashboard/integrations/holded`

Responsabilidades:

- usuarios conectados/desconectados
- sesiones activas
- historial conversacional
- claims
- access requests
- recipients

## Pendientes no bloqueantes

- mantener alias legacy privados solo como compatibilidad interna si hiciera falta
- limpiar docs historicas fuera del bloque canonico del conector
- smoke manual final en produccion
