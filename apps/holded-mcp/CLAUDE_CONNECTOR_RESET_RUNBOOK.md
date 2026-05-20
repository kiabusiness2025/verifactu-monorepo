# Holded MCP Claude Reset Runbook

Runbook para borrar y recrear desde cero el conector custom de Claude usando el branding correcto de Holded.

Fecha de referencia: `2026-04-23`

## 1. Objetivo

Queremos que el conector use el branding correcto de Holded en todo lo que sí controlamos desde `holded-mcp`:

- OAuth page
- landing page
- favicon y rutas de icono habituales
- assets públicos servidos por Vercel

Activos canónicos:

- Holded PNG: `apps/holded/public/brand/holded/holded-diamond-logo.png`
- Holded SVG: `apps/holded/public/Holded/Corporativo/MARKETING/Holded Logo/Holded Logo/Holded_Diamond/SVG/Holded-Diamond-Red.svg`
- Claude SVG: `brand/claude_logo_3ec57d87f2.svg`

Runtime esperado en `apps/holded-mcp/public/`:

- `holded-diamond-logo.png`
- `logo.svg`
- `claude.svg`

## 2. Estado actual esperado

Producción pública:

- MCP: `https://claude.verifactu.business/mcp`
- OAuth metadata: `https://claude.verifactu.business/.well-known/oauth-authorization-server`
- OAuth authorize: `https://claude.verifactu.business/oauth/authorize`

Rutas de branding que deben responder con Holded:

- `https://claude.verifactu.business/favicon.ico`
- `https://claude.verifactu.business/favicon.png`
- `https://claude.verifactu.business/logo.png`
- `https://claude.verifactu.business/icon.png`
- `https://claude.verifactu.business/apple-touch-icon.png`
- `https://claude.verifactu.business/logo.svg`
- `https://claude.verifactu.business/icon.svg`

## 3. Preparación local

1. Ir al repo:
   - `C:\dev\verifactu-monorepo`
2. Sincronizar branding runtime:
   - `pnpm --dir apps/holded-mcp sync:brand`
3. Validar build:
   - `pnpm --dir apps/holded-mcp build`
4. Revisar que `apps/holded-mcp/public/` solo contenga:
   - `holded-diamond-logo.png`
   - `logo.svg`
   - `claude.svg`
   - `index.html`

Nota:

- `favicon.png` ya no es un fichero independiente; `/favicon.ico` y `/favicon.png` son aliases a `holded-diamond-logo.png`.

## 4. Verificación local de assets

Comprobar hashes o contenido:

1. `apps/holded-mcp/public/holded-diamond-logo.png` debe coincidir con:
   - `apps/holded/public/brand/holded/holded-diamond-logo.png`
2. `apps/holded-mcp/public/logo.svg` debe coincidir con:
   - `apps/holded/public/Holded/Corporativo/MARKETING/Holded Logo/Holded Logo/Holded_Diamond/SVG/Holded-Diamond-Red.svg`
3. `apps/holded-mcp/public/claude.svg` debe coincidir con:
   - `brand/claude_logo_3ec57d87f2.svg`

## 5. Despliegue en Vercel

1. Confirmar que `main` contiene los commits de branding y limpieza.
2. Vercel despliega automáticamente al push de `main`. Si no, forzar redeploy desde el dashboard del proyecto `holded-mcp`.
3. Esperar a que el deploy termine.

## 6. Verificación pública después del deploy

Abrir estas URLs directamente:

- `https://claude.verifactu.business/logo.svg`
- `https://claude.verifactu.business/favicon.png`
- `https://claude.verifactu.business/icon.png`
- `https://claude.verifactu.business/oauth/authorize?response_type=code&client_id=test&redirect_uri=https%3A%2F%2Fexample.com%2Fcb&state=test`

Resultado esperado:

- `logo.svg` muestra el diamante rojo de Holded
- `favicon.png` e `icon.png` descargan el PNG correcto de Holded
- la OAuth page muestra Holded a la izquierda y Claude a la derecha

## 7. Borrado completo del conector en Claude

Si mañana queremos reiniciar completamente:

1. Ir a `Claude > Settings > Connectors`.
2. Localizar el conector custom `Holded`.
3. Desinstalar o eliminar el conector.
4. Esperar unos segundos.
5. Cerrar la pestaña o recargar la sesión de Claude.

En Team / Enterprise:

1. El owner también debe revisar `Organization settings > Connectors`.
2. Si sigue existiendo una entrada organizacional antigua, eliminarla ahí también.

## 8. Recreación desde cero en Claude

1. Ir a `Claude > Settings > Connectors`.
2. Añadir conector custom web.
3. Pegar solo:
   - `https://claude.verifactu.business/mcp`
4. No rellenar nada más salvo que Claude lo exija.
5. Dejar que Claude descubra OAuth desde:
   - `/.well-known/oauth-authorization-server`
6. Completar la conexión con la API key de Holded.

## 9. Validación tras recrearlo

Validar en este orden:

1. El conector aparece y conecta correctamente.
2. La pantalla OAuth usa el logo correcto de Holded.
3. Claude puede listar tools y ejecutar una lectura simple.
4. El panel de permisos por tool aparece.

Prueba funcional mínima sugerida:

- pedir a Claude algo como:
  - `¿Puedes acceder a Holded? ¿Qué ves?`

## 10. Cómo interpretar un icono inesperado (V de Verifactu, escudo azul, etc.)

**Actualización 2026-05-19 — DOS root causes confirmados, distintos:**

### Caso A — "V" navy con letra blanca (icono en chips de tool-call)

`apps/holded-mcp/public/favicon.ico` quedó congelado desde la primera versión del servidor (cuando se brandeaba como Verifactu Business v2 con el logo V). Las rutas `/favicon.png`, `/icon.png`, `/apple-touch-icon.png` etc. sí sirven el diamante (van por `sendDiamondPng`), pero `/favicon.ico` iba por `sendDiamondIco` que servía el `.ico` legacy.

**Fix:** `node apps/holded-mcp/scripts/regen-favicon.mjs` + commit + deploy → resuelto en PR #99.

```bash
curl -sS https://claude.verifactu.business/favicon.ico | md5sum
# debe ser d23f99aeb2d1ea5369b6222eba8cd8e7 (NO 2e7fd8c21b1aa5c17991d0053c11dab6 que era el legacy V)
```

### Caso B — Escudo azul con check (icono de la app en la pantalla "Aún no estás conectado")

Era el icono Verifactu Business v1 (`apps/app/public/icono_verifactu.business.png`, 500×500 RGBA, MD5 `6417d69d`). **Eliminado del repo el 2025-12-20** en commit `2ea8e783e` ("replace binary icons with svg"). 5+ meses 404 en todas nuestras URLs.

**Pero Claude.ai lo sigue mostrando.** Conclusión: **Anthropic / Claude.ai tiene el binary cacheado server-side** desde antes de la eliminación, cuando era accesible en `app.verifactu.business/icono_verifactu.business.png` (u otra URL pública). No vuelven a request la URL — sirven su copia cacheada.

**Implicaciones:**

- `theme_color` y `background_color` del `manifest.json` (purgados 2026-05-19 de Verifactu navy/blue a Holded coral) NO arreglan el escudo cacheado.
- Nada que hagamos en `claude.verifactu.business` lo arregla, porque Anthropic no re-scrapea conectores custom no aprobados en el directorio.

**Las únicas dos soluciones reales:**

1. **Conseguir aprobación en el Anthropic Connectors Directory** — con `logo_uri` explícito en la submission v2 form, el icono se sustituye al aprobar.
2. **Migrar a un subdominio nuevo** `holded-claude.verifactu.business` que Anthropic indexa fresh, sin cache previo. Requiere actualizar 7 docs en `docs/anthropic-submission/` + memoria + DNS + Vercel domain alias.

**Red de seguridad implementada 2026-05-19:**

- `apps/holded-mcp/src/app.ts` ahora sirve el rombo Holded también en la URL legacy `/icono_verifactu.business.png`. Si Anthropic alguna vez re-scrapea (no garantizado), recibe el brand actual.

### Bytes de referencia para confirmar root cause

| Icono observado       | Origen                                                                | MD5 del binary                      | Cómo se arregla                            |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| V navy + texto blanco | `apps/holded-mcp/public/favicon.ico` (legacy)                         | `2e7fd8c2` → `d23f99ae`             | Regenerar favicon.ico (PR #99)             |
| Escudo azul con check | `apps/app/public/icono_verifactu.business.png` (eliminado 2025-12-20) | `6417d69d` (cacheado por Anthropic) | Subdominio nuevo o aprobación de directory |
| Rombo coral Holded    | `apps/holded-mcp/public/holded-diamond-logo.png` (canonical)          | `d4a3694f`                          | ✅ Estado deseado                          |

---

**Importante (caso histórico "escudo azul"):** Si Claude.ai muestra un icono inesperado distinto al rombo Holded, comprueba primero si coincide con el _antiguo_ icono azul personalizado de la primera versión de este conector (un escudo azul custom, no el escudo genérico de Claude). Si coincide, trátalo como metadatos en caché — no como fallback genérico. Para limpiarlo:

1. Desinstala el conector desde Claude.ai → Settings → Connectors.
2. Si usas Claude Team/Enterprise, elimínalo también en Organization Settings → Connectors.
3. Limpia tu sesión de Claude: cierra sesión, borra la caché del navegador, vuelve a entrar.
4. Reinstala en `https://claude.verifactu.business/mcp`.
5. Verifica que las URLs públicas de icono son correctas:
   - `https://claude.verifactu.business/holded-diamond-logo.png`
   - `https://claude.verifactu.business/favicon.ico`
   - `https://claude.verifactu.business/icon.png`
6. Comprueba la caché de favicon de Google: `https://www.google.com/s2/favicons?domain=claude.verifactu.business`
7. Solo trátalo como fallback genérico de Claude si el icono mostrado no coincide con ningún asset antiguo Y todas las URLs públicas de branding devuelven el rombo de Holded.

Si después de recrear desde cero sigue apareciendo un icono azul o escudo genérico en:

- lista de conectores
- ficha del conector
- chip de tool dentro del chat

pero a la vez ocurre esto:

- `favicon.ico`, `favicon.png`, `icon.png` y `oauth/authorize` en producción son correctos
- la OAuth page renderiza Holded correctamente
- el conector conecta y funciona

entonces la hipótesis de trabajo debe ser:

- ese icono lo está resolviendo Claude internamente como fallback de UI para conectores custom
- no es un asset legacy que salga del servidor actual

## 11. Criterio para decidir si borrar y rehacer otra vez

Rehacer el conector merece la pena si falla cualquiera de estos puntos:

- Claude no conecta
- Claude sigue usando OAuth antigua o rota
- la página OAuth no muestra Holded correctamente
- una URL pública de branding devuelve un asset incorrecto

No merece la pena rehacerlo otra vez si el único problema es:

- el chip/icono dentro de Claude sigue siendo el azul genérico

## 12. Comandos útiles

Sincronizar branding:

```powershell
pnpm --dir apps/holded-mcp sync:brand
```

Build:

```powershell
pnpm --dir apps/holded-mcp build
```

Ver rutas públicas:

```powershell
start https://claude.verifactu.business/logo.svg
start https://claude.verifactu.business/favicon.png
start "https://claude.verifactu.business/oauth/authorize?response_type=code&client_id=test&redirect_uri=https%3A%2F%2Fexample.com%2Fcb&state=test"
```

## 13. Decisión recomendada para mañana

1. Esperar al día siguiente y comprobar si Claude refresca el icono.
2. Si no cambia, validar primero URLs públicas y OAuth page.
3. Solo si esas validaciones fallan, borrar y recrear el conector.
4. Si todo valida y solo sigue el icono azul dentro de Claude, cerrar el incidente como limitación/fallback de Claude UI.

## 14. Migración a subdominio nuevo (2026-05-19) — `holded-claude.verifactu.business`

**Contexto:** PRs #99 y #100 fixearon todo lo que controlamos en nuestro origen (`favicon.ico` regenerado, `manifest.json` purgado de colores Verifactu, alias legacy `/icono_verifactu.business.png` sirviendo el rombo). Pero la sección 10 confirmó que Anthropic cachea server-side los iconos legacy y no re-scrapea conectores custom no aprobados. Único reset garantizado: subdominio nuevo donde Anthropic indexe fresh.

### Decisiones tomadas

| Variable                                    | Valor                                                 |
| ------------------------------------------- | ----------------------------------------------------- |
| Subdominio nuevo                            | `holded-claude.verifactu.business`                    |
| App name (Anthropic form)                   | `Holded for Claude`                                   |
| Endpoint legacy `claude.verifactu.business` | Mantener vivo en paralelo (alias Vercel, mismo build) |

### Cambios en el código (PR de migración)

1. `apps/holded-mcp/src/app.ts` — `CLAUDE_CONNECT_DEEPLINK` parametrizado vía función `buildClaudeConnectDeeplink(baseUrl, connectorName)` que toma `config.BASE_URL` en lugar del string hardcoded `claude.verifactu.business`. Cambiar el subdominio es ahora un env var change.
2. `apps/holded-mcp/src/public-pages.ts` — `CONNECT_URL` ya no es constante de módulo: `renderLandingPage(baseUrl)` lo construye en cada render desde `baseUrl.replace(/\/$/, '') + '/launch'`.
3. Docs en `docs/anthropic-submission/*.md` actualizados al subdominio nuevo y app name `Holded for Claude`.

### Pasos operativos (Vercel + Anthropic Google Form)

Asumiendo que el PR de migración está mergeado a `main`:

1. **Vercel — añadir subdominio:** Settings → Domains → Add → `holded-claude.verifactu.business`. Configurar el CNAME que pide Vercel a `cname.vercel-dns.com` en el DNS provider. Esperar SSL (~1-2 min).
2. **Vercel — cambiar env var:** Project Settings → Environment Variables → `BASE_URL`. Cambiar de `https://claude.verifactu.business` a `https://holded-claude.verifactu.business`. Aplicar a Production. Redeploy.
3. **Verificación post-deploy:**
   ```bash
   curl -sS https://holded-claude.verifactu.business/.well-known/oauth-authorization-server | jq .issuer
   # Esperado: "https://holded-claude.verifactu.business"
   curl -sS https://holded-claude.verifactu.business/favicon.ico | md5sum
   # Esperado: d23f99aeb2d1ea5369b6222eba8cd8e7 (rombo Holded)
   curl -sS -X POST https://holded-claude.verifactu.business/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   # Esperado: 401 Unauthorized (correcto — necesita Bearer)
   ```
4. **Anthropic Google Form — submission v2:** rellenar el form en https://claude.com/docs/connectors/building/submission con los valores de `docs/anthropic-submission/submission-form-answers.md`. Server name = `Holded for Claude`, MCP URL = `https://holded-claude.verifactu.business/mcp`.
5. **Esperar review manual** (~2 semanas según docs oficiales).
6. **Si Anthropic aprueba con icono correcto:** desconectar el conector viejo en Claude.ai y añadir el nuevo `Holded for Claude` desde el directorio.

### Qué hacer con el dominio legacy `claude.verifactu.business`

Mantener vivo en paralelo. Sirve el mismo build via alias en Vercel. Tras la aprobación de la submission v2, en una ventana controlada se puede:

- Opción A: dejarlo activo indefinidamente (zero break risk, mínimo coste).
- Opción B: configurar 301 redirect a `holded-claude.verifactu.business` a nivel Vercel (rompe MCP POSTs porque la mayoría de clientes no siguen redirects 301 con POST — preferir Opción A).
- Opción C: respond 410 Gone con mensaje "conector renombrado, reconecte desde el directorio Anthropic" (sólo si confirmamos cero usuarios activos).

Recomendación: Opción A hasta que pase tiempo suficiente para confirmar que nadie usa el legacy.

### Si el problema NO se resuelve con el subdominio nuevo

Si tras la submission v2 + aprobación, el directorio Anthropic sigue mostrando branding incorrecto, las hipótesis son:

1. Anthropic está cacheando por `submitter email` u otro identificador, no por dominio. (Improbable, pero verificable cambiando el email de submission.)
2. El form de submission no respeta el `logo_uri` proporcionado y Anthropic sigue scraping `/favicon.ico` del dominio. En ese caso confirmar visualmente que el subdominio nuevo sirve el rombo y abrir ticket a `partnerships@anthropic.com`.
