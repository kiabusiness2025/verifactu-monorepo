# Onboarding: Anadir Empresa (Local-First + eInforma)

## Flujo actual

1. UI llama `GET /api/onboarding/einforma/search?q=...`.
2. Backend busca primero en datos locales (`tenant_profiles` + `tenants`).
3. Si no hay coincidencias, busca en cache fuzzy (`einforma_lookups`).
4. Si tampoco hay, intenta consulta en vivo al proveedor eInforma.
5. Si el proveedor falla, devuelve `200` con `ok: true`, `results: []`, `cacheSource: "unavailable"` (sin romper onboarding).

## Endpoints implicados

- `GET /api/onboarding/einforma/search`
- `GET /api/onboarding/einforma/company?einformaId=...`
- `GET /api/integrations/einforma/company?taxId=...` (boton "Autocompletar empresa")
- `POST /api/onboarding/tenant`

## Reglas operativas

- Buscar por nombre usa estrategia local-first para ahorrar creditos.
- Si no hay resultados por nombre, el flujo recomendado es NIF + `Autocompletar empresa`.
- La pantalla de onboarding no debe bloquearse por fallo del proveedor externo.

## Smoke test corto (manual)

1. Buscar por texto (ej. `expert`) en onboarding.
   - Esperado: dropdown con resultados o mensaje no bloqueante.
2. Forzar fallback (sin resultados) y usar NIF en `Autocompletar empresa`.
   - Esperado: completa campos `nombre/razon social/nif` o devuelve error controlado.
3. Guardar empresa.
   - Esperado: `POST /api/onboarding/tenant` responde `ok: true`.

## Diagnostico rapido

- Si aparece `No se pudo completar la busqueda`, revisar status/body de:
  - `/api/onboarding/einforma/search`
- Si falla detalle por NIF/einformaId, revisar:
  - `/api/onboarding/einforma/company`
  - `/api/integrations/einforma/company`
- Si en Vercel sigue un error ya corregido localmente, verificar branch y commit desplegado.
