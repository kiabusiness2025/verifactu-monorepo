# isaak.verifactu.business

Landing independiente de Isaak dentro del monorepo, con identidad pública separada de verifactu.business.

## Posicion dentro del monorepo

Este proyecto es el proyecto publico 3 de 3:

- `verifactu.business` -> `apps/landing`
- `holded.verifactu.business` -> `apps/holded`
- `isaak.verifactu.business` -> `apps/isaak`

Comparte backend y tenancy con el resto de la plataforma, pero su identidad pública, su documentación de despliegue y sus variables públicas deben mantenerse separadas.

## Objetivo

- Dar identidad propia a Isaak con separación completa de su experiencia pública.
- Reutilizar el contenido y la propuesta de valor de la página `que-es-isaak`.
- Preparar el terreno para un futuro dominio propio como `isaak.pro`.

## Dominio previsto

- Subdominio actual objetivo: `https://isaak.verifactu.business`

## Checklist de proyecto

- Identidad pública separada de `verifactu.business`
- Proyecto Vercel independiente dentro del monorepo
- Root directory configurado en `apps/isaak`
- Dominio público configurado como `isaak.verifactu.business`
- Variables públicas propias de Isaak cargadas en Vercel
- Correo de soporte propio o dedicado para Isaak
- Build validado antes del primer despliegue
- Página de soporte accesible en `/support`
- Política de privacidad y términos accesibles desde el footer

## Vercel

- Proyecto Vercel independiente dentro del monorepo
- Root directory: `apps/isaak`
- Build command: el definido en [apps/isaak/vercel.json](c:\dev\verifactu-monorepo\apps\isaak\vercel.json)
- Variables de entorno base: [isaak-vercel-import.env.example](c:\dev\verifactu-monorepo\isaak-vercel-import.env.example)

### Variables recomendadas para separación completa

- `NODE_ENV=production`
- `NEXT_PUBLIC_ISAAK_SITE_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_APP_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_SITE_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_LANDING_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_HOLDED_SITE_URL=https://holded.verifactu.business`
- `NEXT_PUBLIC_SUPPORT_EMAIL=soporte@isaak.verifactu.business`

Variables mínimas relevantes:

- `NEXT_PUBLIC_ISAAK_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_LANDING_URL`
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Recomendación actual para separación completa:

- `NEXT_PUBLIC_ISAAK_SITE_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_APP_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_SITE_URL=https://isaak.verifactu.business`
- `NEXT_PUBLIC_LANDING_URL=https://isaak.verifactu.business`

### Checklist de despliegue en Vercel

- Crear proyecto nuevo desde el repo `verifactu-monorepo`
- Seleccionar `Root Directory = apps/isaak`
- Confirmar framework `Next.js`
- Cargar las variables de [isaak-vercel-import.env.example](c:\dev\verifactu-monorepo\isaak-vercel-import.env.example)
- Verificar que no se hereden variables antiguas de `verifactu.business` o `app.verifactu.business`
- Asignar el dominio `isaak.verifactu.business`
- Lanzar deploy de producción
- Revisar `/`, `/support`, `/privacy` y `/terms`

### Incidencia detectada en el primer despliegue

Fallo observado:

- `ERR_PNPM_OUTDATED_LOCKFILE`
- Causa: el proyecto se estaba instalando con `--frozen-lockfile` y el lockfile del monorepo no estaba alineado con el nuevo `apps/isaak/package.json`

Solución aplicada:

- El proyecto de Isaak ahora usa `pnpm install --no-frozen-lockfile` en [apps/isaak/vercel.json](c:\dev\verifactu-monorepo\apps\isaak\vercel.json)

Motivo:

- Evita bloquear el despliegue de Isaak por cambios pendientes de lockfile en otras apps del monorepo mientras se termina de estabilizar el workspace

Recomendación posterior:

- Cuando el resto de cambios de workspace estén consolidados, regenerar y subir `pnpm-lock.yaml` para volver a un estado completamente consistente si se quiere restaurar `--frozen-lockfile`

### Checklist de revisión post-deploy

- La home carga en `https://isaak.verifactu.business`
- El CTA principal no envía a `app.verifactu.business`
- El footer no muestra branding de `verifactu.business`
- La ruta `/support` usa el correo correcto de Isaak
- Los enlaces de privacidad y términos funcionan
- Los enlaces a Holded solo apuntan a la compatibilidad, no a la identidad de marca
- No quedan menciones públicas incorrectas a `verifactu.business` dentro de la experiencia principal de Isaak

## Desarrollo local

```bash
pnpm --filter verifactu-isaak dev
```

## Build

```bash
pnpm --filter verifactu-isaak build
```
