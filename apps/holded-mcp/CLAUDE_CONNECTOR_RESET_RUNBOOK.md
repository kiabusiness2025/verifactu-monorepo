# Holded MCP Claude Reset Runbook

Runbook para borrar y recrear desde cero el conector custom de Claude usando el branding correcto de Holded.

Fecha de referencia: `2026-04-23`

## 1. Objetivo

Queremos que el conector use el branding correcto de Holded en todo lo que sí controlamos desde `holded-mcp`:

- OAuth page
- landing page
- favicon y rutas de icono habituales
- assets públicos servidos por Railway

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

## 5. Despliegue en Railway

1. Confirmar que `main` contiene los commits de branding y limpieza.
2. Lanzar redeploy del servicio `holded-mcp` en Railway si no despliega solo.
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

**Actualización 2026-05-19 — root cause confirmado para el caso "V de Verifactu":**

Si Claude.ai muestra una "V" (letra) en lugar del rombo Holded, el problema NO es fallback de UI de Claude — es que `apps/holded-mcp/public/favicon.ico` quedó congelado desde la primera versión del servidor (cuando se brandeaba como Verifactu) y nunca se regeneró desde `holded-diamond-logo.png`. Las rutas `/favicon.png`, `/icon.png`, `/apple-touch-icon.png` etc. sí sirven el diamante (porque van por `sendDiamondPng` que apunta directo al PNG), pero `/favicon.ico` va por `sendDiamondIco` que sirve el `.ico` legacy.

**Fix permanente:** ejecutar `node apps/holded-mcp/scripts/regen-favicon.mjs` para regenerar el ICO multi-resolución (16/32/48/64 px, PNG-encoded RGBA) desde `holded-diamond-logo.png`. Commitear el binario actualizado, bumpear `ICON_VERSION` en `apps/holded-mcp/src/app.ts`, deploy.

**Verificación post-deploy:**

```bash
curl -sS https://claude.verifactu.business/favicon.ico | md5sum
# debe coincidir con el md5 del fichero del repo (NO con 2e7fd8c21b1aa5c17991d0053c11dab6, que era el legacy)
```

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
