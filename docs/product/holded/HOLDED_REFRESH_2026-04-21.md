# Holded Refresh 2026-04-21

## Resumen

Esta entrega rehace la experiencia publica de `holded.verifactu.business`, limpia la marca visible heredada, ordena los formularios de captacion y soporte, y simplifica el panel interno para que hoy refleje solo usuarios y tenants.

El objetivo no ha sido solo visual. Tambien se han revisado los puntos de entrada del flujo real: login, onboarding, avisos de conexion, soporte guiado, emails operativos y compatibilidad con rutas legacy del admin.

## Alcance

Se ha actuado sobre dos aplicaciones:

- `apps/holded`
- `apps/admin`

No se han incluido cambios de limpieza profunda en `apps/isaak` ni cambios estructurales de base de datos.

## Landing y paginas publicas

La landing de Holded se ha rehecho completa con foco en:

- hero mas claro y mas comercial
- copy coherente con el alcance real
- bloques de valor mas orientados a negocio
- capacidades mostradas en desplegables para reducir longitud
- CTA separados para conectar, pedir demo y contactar

Se han creado paginas dedicadas para formularios:

- `/demo`
- `/contacto`

Tambien se han revisado paginas de apoyo:

- `/capacidades`
- `/planes`
- `/demo-recording`
- `/support`
- `/terms`
- `/legal`
- pantallas de error y not found

## Formularios

Se ha corregido la inversion que habia entre los formularios:

- `Solicitar demo` o prueba guiada ahora usa formulario largo con datos de perfil y empresa.
- `Contacto` usa formulario corto con campos minimos.

### Demo / prueba guiada

Campos actuales:

- nombre
- email
- telefono
- empresa
- CIF/NIF
- sector
- rol
- mensaje / objetivo
- consentimiento

### Contacto

Campos actuales:

- nombre
- email
- mensaje
- consentimiento

## Flujos revisados

Se ha alineado el copy visible de:

- login y acceso a Holded
- onboarding de conexion
- onboarding de contexto inicial
- pagina de verificacion
- pagina de bienvenida / exito
- soporte guiado
- mensajes de error

La terminologia publica ahora prioriza:

- `conexion`
- `panel`
- `contexto inicial`
- `canal Holded`

Y evita la terminologia anterior basada en:

- `Isaak`
- `dashboard` como etiqueta comercial principal
- `asistente` cuando no aporta claridad real

## Emails y comunicaciones

Se han revisado los contenidos principales de correo para que:

- usen copy coherente con Holded
- apunten al `panel de control`
- mantengan la separacion correcta entre flujo ChatGPT y flujo panel
- recojan mejor la informacion ampliada de las solicitudes de demo

Tambien se ha actualizado la notificacion interna de registro para reflejar el panel simplificado.

## Panel interno

El admin se ha simplificado visualmente para el alcance actual.

### Vista canonica

Las rutas canonicas quedan en:

- `/panel`
- `/users`
- `/tenants`

### Cambios aplicados

- navegacion principal reducida a panel, usuarios y tenants
- copy de admin alineado con `Holded Admin`
- desaparicion de referencias visibles a `Holded + ChatGPT`
- desaparicion de referencias visibles a `Isaak`
- panel principal centrado en actividad de usuarios y tenants

### Compatibilidad legacy

Las rutas heredadas de `dashboard/admin/*` no se eliminan todavia, pero ahora redirigen a las vistas canonicas nuevas para evitar que sigan exponiendo modulos antiguos.

Esto mantiene compatibilidad con enlaces existentes sin conservar la experiencia vieja.

## Rutas legacy mantenidas como redirect

Entre otras:

- `/dashboard/admin`
- `/dashboard/admin/panel`
- `/dashboard/admin/users`
- `/dashboard/admin/users/[id]`
- `/dashboard/admin/tenants`
- `/dashboard/admin/companies`
- `/dashboard/admin/chat`
- `/dashboard/admin/integrations`
- `/dashboard/admin/emails`
- `/dashboard/admin/reports`

## Limpieza de marca

En la experiencia visible ya no deben aparecer menciones de `Isaak` en:

- landing
- demo
- contacto
- login
- onboarding
- soporte
- panel simplificado
- rutas legacy visibles del admin

Persisten referencias tecnicas internas en algunos nombres heredados de APIs, tests o campos de datos. No afectan a la experiencia visible y se pueden abordar en una limpieza posterior mas profunda.

## Validacion

Builds validados:

- `pnpm -C apps/holded build`
- `pnpm -C apps/admin build`

## Siguiente limpieza recomendada

Si se quiere dejar el repositorio completamente alineado con la nueva nomenclatura, el siguiente bloque razonable es:

- renombrar APIs y tipos internos heredados de `Isaak`
- revisar exports y mocks de test
- revisar campos legacy como `isaak_tone`
- limpiar assets y directorios antiguos no usados
