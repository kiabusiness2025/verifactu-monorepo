# isaak.verifactu.business

Landing independiente de Isaak dentro del monorepo de verifactu.business.

## Objetivo

- Dar identidad propia a Isaak sin salir todavía del ecosistema actual.
- Reutilizar el contenido y la propuesta de valor de la página `que-es-isaak`.
- Preparar el terreno para un futuro dominio propio como `isaak.pro`.

## Dominio previsto

- Subdominio actual objetivo: `https://isaak.verifactu.business`

## Vercel

- Proyecto Vercel independiente dentro del monorepo
- Root directory: `apps/isaak`
- Build command: el definido en [apps/isaak/vercel.json](c:\dev\verifactu-monorepo\apps\isaak\vercel.json)
- Variables de entorno base: [isaak-vercel-import.env.example](c:\dev\verifactu-monorepo\isaak-vercel-import.env.example)

Variables mínimas relevantes:

- `NEXT_PUBLIC_ISAAK_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_LANDING_URL`
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

## Desarrollo local

```bash
pnpm --filter verifactu-isaak dev
```

## Build

```bash
pnpm --filter verifactu-isaak build
```
