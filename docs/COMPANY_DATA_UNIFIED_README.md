# Datos de Empresa Unificados (Admin + App)

## Objetivo
Definir un flujo único de alta y gestión de empresa entre `admin` y `app`, separando:
- Datos mercantiles de fuente pública (solo referencia legal).
- Datos fiscales/operativos (editable por cliente bajo responsabilidad).

## Estado actual implementado
### Flujo de creación en Admin (unificado)
- La creación de empresa se realiza desde modal en `Empresas` (`/dashboard/admin/companies`).
- La ruta `/dashboard/admin/companies/new` redirige al mismo flujo con `?create=1`.
- Se eliminó la duplicidad visual de menú (`Tenants`) para reducir confusión.
- La ruta legacy `/dashboard/admin/empresas` reutiliza la misma vista para evitar doble modal/UX.

### Búsqueda y selección de empresa
- Búsqueda con debounce y ranking por relevancia.
- Para consultas de 2+ palabras, se exige coincidencia de todos los términos para reducir ruido.
- Soporte de búsqueda por identificador fiscal y por identificador interno del proveedor de datos.
- Mensajería de ayuda para afinar búsquedas en casos de alta cardinalidad.

### Carga de perfil mercantil
- Al seleccionar una empresa, se intenta cargar ficha completa usando claves candidatas (`nif`, `id`) para evitar falsos negativos.
- Se corrigió la pérdida de resultados por normalización agresiva del identificador.
- Se evita el efecto de “doble búsqueda” tras seleccionar una empresa.
- Se mejoró el fallback de perfil cacheado: si faltan campos en snapshot local, se extraen del `raw` persistido.
- En Admin se exponen también campos ampliados de perfil cuando existen:
  - `email`, `phone`, `employees`, `sales`, `salesYear`, `capitalSocial`, `constitutionDate`, `lastBalanceDate`.

### UX modal Admin (últimos ajustes)
- `Datos básicos` y `Datos ampliados` son secciones desplegables con indicador visual.
- Se añadieron botones rápidos `Guardar` y `Cancelar` antes del bloque informativo.
- El bloque inferior mantiene la opción `Algunos datos son incorrectos` solo para flujo Admin.
- En ficha de empresa Admin se habilitó `Exportar PDF` (vía impresión del documento corporativo).

### Persistencia y cache
- Al crear empresa desde admin se crea `tenant` y `tenant_profile`.
- Se persiste `source`, `source_id`, snapshot mercantil y metadata de sincronización.
- `einforma_raw` guarda el payload completo del proveedor (`raw`), incluyendo campos no mapeados aún.
- `admin_edit_history` guarda solo historial de correcciones manuales hechas desde Admin.
- Columnas adicionales en `tenant_profiles` para explotación Admin:
  - `email`, `phone`, `employees`, `sales`, `sales_year`, `last_balance_date`.
- El endpoint de perfil consulta primero snapshot local y lookup cache antes de ir al proveedor externo.
- Se incorporó fallback de listado de empresas en `/api/admin/tenants` para esquemas mixtos (degradado sin 500).

### Colaboradores y ownership
- Alta de colaboradores por email + rol en el flujo de creación.
- Envío de invitación por correo y aceptación posterior.
- `support@verifactu.business` se asigna automáticamente con rol `owner`.
- Modelo multiempresa activo por `memberships` (N:M usuario-empresa).

## Principios funcionales
1. Datos mercantiles = referencia legal pública.
2. Datos fiscales/operativos = responsabilidad del cliente.
3. Isaak usa ambos planos para asistencia, clasificación y calendario.

## UX y comunicación al usuario (vigente)
### En el modal de creación
- Texto informativo:
  - cómo funciona la búsqueda.
  - que los datos son públicos del Registro Mercantil.
- Enlace de ayuda:
  - `No aparece tu empresa en el listado, pulsa aquí`
  - redirige a Isaak en admin con contexto pre-cargado del caso.

### En panel Cliente (onboarding)
- El buscador muestra solo datos básicos en UI: `nombre`, `CIF/NIF`, `dirección`.
- Antes de guardar se informa que:
  - en modo prueba solo se permite 1 empresa real.
  - los datos principales del alta no se pueden modificar desde ese flujo.
- Acciones de cierre del alta: `Guardar` o `Cancelar`.
- Aunque la UI sea básica, el backend conserva snapshot completo (`raw`) para soporte/Admin.

### Criterio de marca en UI
- Evitar menciones explícitas del proveedor de datos en mensajes de error/ayuda generales.
- Mantener el detalle técnico solo donde sea estrictamente necesario para diagnóstico.

## Reglas de datos
- Mercantil:
  - se rellena desde fuente pública.
  - se guarda snapshot de referencia en `einforma_raw`.
- Fiscal:
  - editable en módulos fiscales/facturación (roadmap).
- Trazabilidad:
  - conservar `source`, `source_id`, `updated_at`, `einforma_raw` y `admin_edit_history` cuando aplique.

## Limpieza TS/Workspace (operativa)
### Síntoma observado
- `tsc` puede fallar con `Cannot find module '@verifactu/*'` cuando los symlinks de workspace quedan apuntando a rutas externas (ej: host local Windows) o cuando `node_modules` queda parcialmente instalado.

### Endurecimiento aplicado
- `apps/admin/tsconfig.json` ahora añade `paths` explícitos para:
  - `@verifactu/auth`
  - `@verifactu/db`
  - `@verifactu/integrations`
  - `@verifactu/ui`
  - `@verifactu/utils`
- Esto evita depender exclusivamente de symlinks de `node_modules` para resolución interna del monorepo.

### Procedimiento recomendado de recuperación
1. Eliminar módulos corruptos del paquete afectado (ejemplo Admin):
   - `rm -rf apps/admin/node_modules`
2. Reinstalar con store en ruta escribible y modo CI:
   - `CI=true pnpm install --filter verifactu-admin... --frozen-lockfile --store-dir /tmp/pnpm-store`
3. Verificar tipos:
   - `pnpm -w --filter verifactu-admin exec tsc --noEmit`

### Notas de entorno
- Si hay errores `EAI_AGAIN`, el problema es conectividad DNS/red al registro npm.
- Si hay errores `EPERM`/`EACCES`, revisar permisos/owner del store o usar `--store-dir /tmp/pnpm-store`.

## Definición de `raw`
- `raw` = respuesta completa devuelta por el proveedor de datos para una empresa concreta.
- Uso principal:
  - Diagnóstico cuando un campo visible no coincide.
  - Reprocesado para mapear nuevos campos sin volver a consumir crédito.
  - Evidencia técnica para soporte/escalado.
- En UI no se expone completo al cliente final; se usa internamente en Admin/soporte.

## Roadmap inmediato
1. Modelo `fiscal_profile` persistente (AEAT/IAE/obligaciones).
2. Pestaña fiscal en admin y app con validación y responsabilidad explícita.
3. Reglas automáticas para calendario fiscal por obligaciones.
4. Auditoría de cambios en datos fiscales sensibles.
5. Dashboard de calidad de datos mercantiles/fiscales (coherencia y discrepancias).
