# isaak.verifactu.business

Producto principal visible de la plataforma.

## Rol dentro del monorepo

- `apps/isaak`: producto principal conversacional
- `apps/holded`: captacion, login, conexion Holded y handoff
- `apps/app`: core compartido y panel avanzado
- `apps/admin`: backoffice

## Que debe vivir aqui

- chat
- historial
- memoria
- onboarding conversacional ligero
- ajustes ligeros
- soporte guiado

## Que no debe vivir aqui

- landing especifica Holded
- configuracion fiscal o contable compleja
- backoffice
- logica compartida importada desde `apps/holded`

## Estado del sprint actual

- `/chat` ya es el workspace principal de producto
- la sesion y la lectura de conexion Holded se resuelven sin importar codigo desde `apps/holded`
- el chat core ya se resuelve desde capa compartida en `packages/integrations`

## Desarrollo local

```bash
pnpm --filter verifactu-isaak dev
```

## Build

```bash
pnpm --filter verifactu-isaak build
```
