# Datos de Empresa Unificados (Admin + App)

## Objetivo
Definir un flujo único para gestionar datos de empresa en `admin` y `app`, separando:
- Datos mercantiles (fuente pública: Registro Mercantil / eInforma).
- Datos fiscales y operativos (fuente principal: AEAT + validación del cliente).

## Estado actual (implementado)
- En `admin`, al crear empresa desde eInforma:
  - Se autocompleta ficha mercantil.
  - Los campos mercantiles quedan bloqueados para edición manual.
  - Se informa al usuario que los datos provienen de fuente pública y que incidencias van por soporte.
- La búsqueda eInforma ya funciona con ranking mejorado de resultados por coincidencia.
- El endpoint de creación en `admin` crea `tenant` y `tenant_profile`.
- Flujo inicial de colaboradores:
  - Pestaña `Contacto y usuarios` en alta de empresa de admin.
  - Alta de colaboradores por email + rol.
  - Envío de invitación por correo con enlace de aceptación (basado en plantilla de invitación de equipo ya definida en `apps/app/lib/email/emailService.ts`).
  - Activación de membership al aceptar invitación.

## Principio funcional
1. `Registro Mercantil (eInforma)` = verdad mercantil (solo lectura en UI).
2. `AEAT + cliente` = verdad fiscal/operativa (editable bajo responsabilidad).
3. ISAaK consume ambos planos:
   - Mercantil: identidad legal y contexto.
   - Fiscal/operativo: clasificación, deducibilidad y calendario fiscal.

## UI objetivo
### Pestaña 1: Datos Mercantiles (solo lectura)
- Razón social, NIF/CIF, forma jurídica, estado, domicilio social, CNAE mercantil, representante(s).
- Aviso legal:
  - Datos extraídos del Registro Mercantil.
  - Si no coinciden, abrir ticket de soporte con evidencia documental.

### Pestaña 2: Datos Fiscales / Facturación (editable)
- Domicilio fiscal (puede diferir del social).
- Actividades económicas (IAE/CNAE fiscal).
- Obligaciones fiscales para calendario:
  - Empleados: modelos `111` y `190`.
  - Local en alquiler: modelos `115` y `180`.
  - Representante no residente: `210`, `216`, `296`.
  - Representante residente (según caso): `100`, `214`, `123`, `720`.
- Campo de responsabilidad:
  - “Datos introducidos por el cliente bajo su responsabilidad”.

## ISAaK: guías requeridas
- Guía: obtener/modificar datos censales en AEAT.
- Guía: cómo obtener y subir certificado IAE.
- Guía: cómo revisar obligaciones que alimentan calendario fiscal.
- Guía: impacto de actividades declaradas en deducibilidad de gastos/ventas.

## Flujo de alta Admin -> App
## Implementado
- Alta de empresa en `admin` crea `tenant` y `tenant_profile`.
- `support@verifactu.business` se asigna automáticamente con rol `owner` (superadmin operativo) en empresas creadas desde:
  - `admin` (alta de empresas/tenants).
  - `app` (onboarding de tenant).
- Usuarios pueden administrar múltiples empresas vía tabla `memberships` (relación N:M).

## Pendiente
- Mejorar UX de aceptación de invitaciones (pantalla dedicada + estados detallados).
- Revisión completa del flujo de provisión de usuarios base por empresa según vertical y tipo de cliente.
- Política inicial recomendada:
  - `OWNER_ADMIN` (titular / responsable principal).
  - `ACCOUNTANT` (asesoría/contable).
  - `READ_ONLY` (consulta).

## Reglas de datos
- Campos mercantiles no se editan manualmente cuando `source = einforma`.
- Campos fiscales sí son editables y versionables.
- Registrar `source`, `source_id`, `updated_at`, y evidencia de cambios críticos.

## Próximos pasos técnicos
1. Crear modelo persistente para `fiscal_profile` (AEAT/IAE/obligaciones).
2. Implementar pestaña fiscal en `admin` y en `app`.
3. Integrar reglas de calendario fiscal según flags y residencia.
4. Integrar en ISAaK clasificación fiscal por actividad declarada.
5. Añadir auditoría de cambios para datos fiscales sensibles.
