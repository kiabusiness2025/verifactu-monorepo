# verifactu.business core (`apps/app`)

`apps/app` es el core canónico de negocio del monorepo. No es el producto conversacional principal ni el canal de captación Holded.

## Ownership

Este proyecto es la fuente de verdad para:

- tenants
- users
- memberships
- subscriptions
- billing y acceso a plan
- configuracion fiscal y contable compleja
- VeriFactu
- ajustes avanzados de empresa
- APIs internas canónicas

## Regla principal

Cuando exista duda sobre el modelo de datos compartido, la referencia oficial es:

- [schema.prisma](./prisma/schema.prisma)

Ese schema define el modelo común que deben consumir `apps/isaak`, `apps/holded`, `apps/admin` y cualquier otra capa pública o interna.

## Qué no debe vivir aquí

- landing específica de Holded
- onboarding ligero de captación
- experiencia principal de chat de Isaak
- branding público específico de un canal

## Rol dentro del mapa de producto

- `apps/isaak`: producto principal visible y conversacional
- `apps/holded`: captación, login, conexión Holded y handoff
- `apps/app`: core compartido y panel avanzado
- `apps/admin`: backoffice y operaciones

## Criterio técnico

Nuevos módulos compartidos deben nacer aquí o en `packages/*` cuando:

- afecten al modelo canónico
- expongan APIs internas reutilizables
- definan settings complejos
- soporten billing, tenancy o fiscalidad

## Migraciones siguientes

Los siguientes módulos deben converger progresivamente aquí o extraerse desde aquí a `packages/*`:

- auth y sesión unificada
- billing y plan access
- chat core y memoria de Isaak
- integraciones compartidas
- navegación segura entre dominios
