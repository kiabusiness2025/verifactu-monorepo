# Automatización de i18n

Este documento describe cómo **detectar** textos hardcoded y moverlos a los archivos de idioma.

## Script de auditoría

El script `scripts/i18n-audit.js` escanea el monorepo y genera un reporte con cadenas de UI candidatas.

### Uso rápido
```bash
pnpm i18n:audit
```
Genera: `docs/I18N_AUDIT.md`

### Limitar el análisis
```bash
node scripts/i18n-audit.js --paths apps/app,apps/landing --limit 200
```

### Check (para CI)
```bash
pnpm i18n:check
```
Falla si encuentra **nuevas** cadenas que no estén en el baseline.
El baseline por defecto es `docs/I18N_AUDIT.md`.

## Cómo mover textos a i18n

1) Abre `docs/I18N_AUDIT.md` y elige los textos a centralizar.
2) Añádelos en `apps/app/lib/i18n/es.ts` (o crea archivo similar en otros paquetes).
3) Sustituye en UI:  
   Antes:
   ```tsx
   <h2>Configuración</h2>
   ```
   Después:
   ```tsx
   import { es } from "@/lib/i18n/es";
   <h2>{es.settings.title}</h2>
   ```
4) Repite por módulos.

## Convención sugerida

- Usa claves por feature: `dashboard`, `auth`, `admin`, `emails`, etc.
- Evita frases duplicadas: reutiliza claves compartidas.
- Mantén los textos en español en `es.ts` y añade otros idiomas en carpetas paralelas cuando toque.

## Notas

La auditoría es heurística (regex). Revisa manualmente antes de mover textos.
Si quieres aceptar nuevos textos como baseline, vuelve a generar el reporte con `pnpm i18n:audit`.
