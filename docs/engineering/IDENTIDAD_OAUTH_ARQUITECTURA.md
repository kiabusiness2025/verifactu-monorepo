# Arquitectura de identidad y OAuth (Verifactu)

## Decision recomendada

- Unificar la identidad de usuarios finales en un solo proveedor central (Firebase Auth) para todos los hubs web de Verifactu.
- Mantener OAuth de conectores de terceros (ChatGPT, Claude y futuros) en un servidor OAuth separado y especializado.
- Usar un cliente OAuth de Google por aplicacion y entorno, aunque pertenezcan al mismo proyecto de Firebase.

## Por que esta estructura

- Menor friccion para usuario: una sola sesion compartida entre subdominios.
- Menor riesgo operativo: cada app/entorno tiene su propio client_id y redirect URIs.
- Escalabilidad para conectores: el servidor OAuth de conectores no depende del login social.

## Estructura objetivo

### 1) Identidad humana (B2C)

- IdP: Firebase Auth (proyecto corporativo unico).
- Apps: verifactu.business, holded.verifactu.business, isaak.verifactu.business.
- Sesion compartida: cookie `__session` con dominio `.verifactu.business`.

### 2) OAuth de conectores (M2M / Apps de terceros)

- AS canónico: `app.verifactu.business`.
- Endpoints publicados por vertical cuando aplique (proxy o dominio de marca), pero backend OAuth central.
- Flujos: `authorization_code + PKCE`, DCR para clientes publicos cuando corresponda.

### 3) Google OAuth

- Mismo proyecto de Firebase: si.
- Mismo client_id para todo: no.
- Regla:
  - 1 client_id web para landing/prod
  - 1 client_id web para holded/prod (si dominio o redirect distinto)
  - 1 client_id web para isaak/prod (si aplica)
  - Repetir por preview/staging si cambia dominio

## Politica de limpieza

- Prohibido versionar secretos o dumps de credenciales JSON.
- Mantener solo `.env.example` con placeholders.
- Rotar secretos inmediatamente cuando aparezcan en repositorio.

## Checklist de implementacion

- [ ] Revisar en Vercel que todos los proyectos usen `SESSION_COOKIE_DOMAIN=.verifactu.business`.
- [ ] Confirmar `SESSION_COOKIE_SAMESITE=none` y `SESSION_COOKIE_SECURE=true` en produccion.
- [ ] Confirmar un unico proyecto de Firebase para identidad humana.
- [ ] Confirmar client_id por app/entorno y redirect URIs exactas.
- [ ] Confirmar que el menu del hub Holded no fuerce onboarding de un conector concreto.
- [ ] Eliminar artefactos legacy de credenciales del repositorio.
- [ ] Rotar credenciales historicamente expuestas.
