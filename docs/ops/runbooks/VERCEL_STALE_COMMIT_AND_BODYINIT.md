# Vercel Deploy Debug: Stale Commit + BodyInit

Fecha: 2026-03-04

## Síntoma 1: deploy falla con código que ya está corregido
En logs de Vercel aparece un commit antiguo en la línea de clonado, por ejemplo:

`Cloning ... (Branch: main, Commit: 2a0d4b2)`

aunque en `main` ya existe un commit posterior con fix.

### Causa
Vercel está ejecutando un deployment sobre una revisión anterior (reintento/manual deploy desde snapshot previo o webhook retrasado).

### Verificación rápida
1. Confirmar último commit en local/remoto:
   - `git rev-parse --short HEAD`
   - `git log --oneline -n 5`
2. Revisar en Vercel la línea exacta de clonado (Branch + Commit).
3. Si el hash no coincide con `main`, ese deploy no está usando la revisión actual.

### Acción
1. Lanzar un redeploy desde el último commit de `main`.
2. Si sigue tomando hash anterior, crear un commit vacío para forzar webhook:
   - `git commit --allow-empty -m "chore: trigger vercel deploy"`
   - `git push origin main`
3. Volver a verificar en logs que el hash de clonado sea el esperado.

---

## Síntoma 2: error TypeScript `Buffer` no asignable a `BodyInit`
Ejemplo:

`Argument of type 'Buffer<ArrayBufferLike>' is not assignable to parameter of type 'BodyInit'`

Afecta respuestas binarias (`pdf`, `xlsx`) con `NextResponse` en Next 15.

### Regla de implementación
No devolver `Buffer` directamente en `new NextResponse(...)`.

Usar siempre:

```ts
return new NextResponse(new Uint8Array(fileBuffer), { ...headers })
```

### Puntos del repo ya corregidos
- `apps/app/app/api/invoices/[id]/pdf/route.ts`
- `apps/app/lib/aeat/response.ts`

---

## Smoke rápido post-fix
1. PDF factura:
   - `GET /api/invoices/:id/pdf` -> `200` y archivo PDF válido.
2. XLSX AEAT:
   - `GET /api/aeat/books/sales?from=...&to=...&format=xlsx` -> `200` y archivo no vacío.

Si ambos pasan, el fix de `BodyInit` está aplicado correctamente.
