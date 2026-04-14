# Holded Direct Connector Post-Release Smoke Evidence 2026

Usar este documento como plantilla viva cada vez que se ejecute el smoke manual en entorno real o en tenant demo antes/despues de un despliegue sensible.

Ultima actualizacion: 2026-04-13

## Metadatos

- Fecha: 2026-04-13
- Entorno:
  - `tenant demo`
- Responsable: ejecucion asistida en workspace local
- Commit / tag: `7e32f84b`
- Dominio publico verificado:
  - no ejecutado en esta tanda
- Runtime privado verificado:
  - no ejecutado en esta tanda

## 1. Pre-check tecnico

Marcar:

- [x] `pnpm --filter verifactu-holded exec tsc --noEmit`
- [x] `pnpm --filter verifactu-app exec tsc --noEmit`
- [x] `pnpm --filter @verifactu/integrations type-check`
- [x] `pnpm holded:ci:contract`

Notas:

- checks tecnicos completados localmente antes de registrar la evidencia
- `holded:ci:contract` pasa con `27 passed, 0 failed`

## 2. Smoke demo Holded

### Comando usado

```bash
pnpm holded:demo:validate
```

O, si solo se ejecuta smoke:

```bash
pnpm holded:demo:validate -- --smoke-only
```

### Resultado

- Estado:
  - `ok`
- Resumen: `pnpm holded:demo:validate` completado con `105 passed, 0 failed, 105 total checks`
- Fuente de `HOLDED_TEST_API_KEY`: `apps/holded/.env.local`
- Evidencia principal:
  - seed completado
  - smoke Holded directo completado
  - `saleschannels.create` reintentado con exito tras 6 intentos, coherente con la semantica documentada de Holded
  - `treasury.delete` y `payments.treasury_delete` devuelven `405`, coherente con la semantica documentada de Holded

## 3. Smoke funcional publico

### Landing y acceso

- [ ] Carga `https://holded.verifactu.business`
- [ ] El flujo de acceso Google sigue vivo
- [ ] No se han cambiado las URLs legales del flujo OAuth Google

Notas:

- no ejecutado en esta tanda
- esta evidencia corresponde al runner real contra el tenant demo de Holded, no a una validacion manual de los dominios desplegados

### Validate / connect

- [ ] `POST /api/holded/validate` responde
- [ ] Devuelve `requestId`
- [ ] Detecta empresa
- [ ] Maneja `duplicateConflict` si aplica
- [ ] `POST /api/holded/connect` responde

Request IDs observados:

- `validate`: no ejecutado en esta tanda
- `connect`: no ejecutado en esta tanda

## 4. Smoke funcional privado

### Panel admin del conector

- [ ] Accede la cuenta allowlisted de soporte
- [ ] Una cuenta no allowlisted queda bloqueada
- [ ] El panel carga badges, banners y acciones

### Estado y acciones

- [ ] `status` devuelve `requestId`
- [ ] `status` devuelve `governanceFlags`
- [ ] `status` devuelve `availableActions`
- [ ] `disconnect` exige confirmacion reforzada
- [ ] `disconnect` bloquea si aplica
- [ ] `rotate-key` responde
- [ ] `memberships` responde
- [ ] `recipients` responde
- [ ] `access-requests` responde
- [ ] `claims` responde

Request IDs observados:

- `status`: no ejecutado en esta tanda
- `disconnect`: no ejecutado en esta tanda
- `rotate-key`: no ejecutado en esta tanda
- `claims`: no ejecutado en esta tanda
- `access-requests`: no ejecutado en esta tanda

Notas:

- no ejecutado en esta tanda
- pendiente para una salida real de `preview` o `production` con cuenta admin allowlisted

## 5. Observabilidad

### Logs revisados

- [ ] `apps/holded` validate/connect/status
- [ ] `apps/app` status/connect/disconnect/rotate-key
- [ ] logs con `requestId` trazables

Observaciones:

- no aplica a este pase
- el runner ejecutado consume directamente la API de Holded y deja evidencia por salida de consola, no por `requestId` del runtime app/holded

## 6. Incidencias

| Severidad | Superficie         | Descripcion                                                                                            | Request ID | Estado   |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------ | ---------- | -------- |
| baja      | tenant demo Holded | `saleschannels.create` requirio 6 intentos por colision de `accountNum`; comportamiento ya documentado | n/a        | aceptado |
| baja      | tenant demo Holded | `treasury.delete` y `payments.treasury_delete` devuelven `405`; comportamiento ya documentado          | n/a        | aceptado |

## 7. Decision de salida

- Estado final:
  - `release aceptada con observaciones`

- Motivo:

- el tenant demo de Holded pasa la regresion viva real
- los checks tecnicos previos pasan
- queda pendiente ejecutar el smoke manual sobre `holded.verifactu.business` y `app.verifactu.business` cuando haya una salida efectiva de `preview` o `production`

- Siguientes acciones:

- ejecutar esta misma plantilla sobre el dominio desplegado en la siguiente salida sensible
- registrar entonces `requestId` reales de `validate`, `connect`, `status`, `disconnect` y `claims`

## Referencias

- [HOLDED_DIRECT_CONNECTOR_RELEASE_CHECKLIST_2026.md](./HOLDED_DIRECT_CONNECTOR_RELEASE_CHECKLIST_2026.md)
- [../ai/HOLDED_DEMO_REGRESSION.md](./ai/HOLDED_DEMO_REGRESSION.md)
- [../../scripts/holded-full-smoke.mjs](../../scripts/holded-full-smoke.mjs)
- [../../scripts/holded-demo-regression.mjs](../../scripts/holded-demo-regression.mjs)
