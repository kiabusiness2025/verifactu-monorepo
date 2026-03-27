# isaak.verifactu.business

Producto principal visible de la plataforma.

## Rol dentro del monorepo

- `apps/isaak`: producto principal conversacional
- `apps/holded`: captación, login, conexión Holded y handoff
- `apps/app`: core compartido y panel avanzado
- `apps/admin`: backoffice

## Qué debe vivir aquí

- chat
- historial
- memoria
- onboarding conversacional ligero
- ajustes ligeros
- soporte guiado

## Qué no debe vivir aquí

- landing específica Holded
- configuración fiscal o contable compleja
- backoffice
- lógica compartida importada desde `apps/holded`

## Estado del sprint actual

- `/chat` ya es el workspace principal de producto
- la sesión y la lectura de conexión Holded se resuelven sin importar código desde `apps/holded`
- el chat core sigue reutilizando temporalmente `holded-chat` mientras se prepara su extracción propia

## Desarrollo local

```bash
pnpm --filter verifactu-isaak dev
```

## Build

```bash
pnpm --filter verifactu-isaak build
```
