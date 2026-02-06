# ISAAK: Intelligent Error Detection & Auto-Resolution

> **Isaak** es el orquestador principal que **ve y soluciona errores automáticamente**, permitiendo que Vercel se redeploy sin intervención manual.

## 🧠 ¿Qué es ISAAK?

**ISAAK** = **I**ntelligent **S**ystem for **A**utomatic **A**nalysis and **K**-fixing

Es un conjunto de scripts que:

1. **Detecta errores** en los builds antes de Vercel
2. **Analiza logs** automáticamente
3. **Soluciona problemas** de forma inteligente
4. **Genera reportes** detallados
5. **Prepara el código** para despliegue exitoso

## 📋 Scripts Disponibles

### 1. `./scripts/isaak.sh` (PRINCIPAL)

```bash
cd /path/to/verifactu-monorepo
./scripts/isaak.sh
```

**¿Qué hace?**

- ✅ Analiza ambiente (Node, pnpm, Git)
- ✅ Verifica dependencias
- ✅ Ejecuta builds locales (app + landing)
- ✅ Detecta errores automáticamente
- ✅ Intenta fixes automáticos
- ✅ Genera reporte en `.isaak/reports/`

**Salida esperada:**

```
✓✓✓ ALL SYSTEMS OPERATIONAL ✓✓✓

Ready for deployment:
  1. git add . && git commit -m 'fix: resolve build errors'
  2. git push origin main
  3. Vercel auto-deploys (2-3 mins)
```

### 2. `./scripts/isaak-diagnostics.sh`

```bash
./scripts/isaak-diagnostics.sh
```

**¿Qué hace?**

- Análisis estático de código
- Detección de imports rotos
- Verificación de configuración
- Prueba de compilación local
- Chequeo de Git readiness

### 3. `./scripts/isaak-auto-fixer.sh`

```bash
./scripts/isaak-auto-fixer.sh
```

**¿Qué hace?**

- Intenta solucionar errores comunes
- Mueve dependencias entre sections
- Corrige rutas de imports
- Valida variables de entorno

### 4. `./scripts/fix-prisma.sh`

```bash
./scripts/fix-prisma.sh
```

**¿Qué hace?**

- Maneja problemas específicos de Prisma
- Regenera Prisma Client
- Fallback automático si algo falla

## 🚀 Flujo de Trabajo Recomendado

### Workflow Normal

```bash
# 1. Desarrollar cambios
# (haces cambios en el código)

# 2. Ejecutar Isaak
./scripts/isaak.sh

# 3. Si todo está OK, desplegar
git add .
git commit -m "feat: your changes"
git push origin main

# 4. Vercel auto-redeploya en 2-3 minutos
# Puedes monitorear en: https://vercel.com/dashboard
```

### Workflow con Errores

```bash
# 1. Haces cambios
# 2. Ejecutar Isaak
./scripts/isaak.sh

# Si hay errores:
# ✗ BUILD ERRORS DETECTED
#   Remaining errors: 1

# 3. Revisar reporte
cat .isaak/reports/[timestamp]-report.md

# 4. Revisar build log
# (el script te dice dónde está)

# 5. Decidir:
# - Si Isaak no pudo arreglarlo: arreglar manualmente
# - Si Isaak lo arregló: continuar con git push
```

## 📊 Reportes Generados

Cada ejecución de `isaak.sh` genera un reporte en:

```
.isaak/reports/
├── 2024-01-13_18-30-45-report.md
├── 2024-01-13_18-45-22-report.md
└── ...
```

Cada reporte contiene:

- Timestamp de análisis
- Versiones de Node/pnpm/Git
- Status de dependencias
- Resultado de compilación
- Errores encontrados
- Fixes aplicados
- Recomendaciones

## 🔍 Errores Comunes que ISAAK Detecta

### 1. **Prisma Client Placement**

```
✗ @prisma/client NOT in dependencies

Solución: Mover a dependencies
```

### 2. **Broken Imports**

```
✗ Found incorrect import paths:
  → apps/app/app/api/chat/route.ts
  from '../../../lib/prisma'  (❌ wrong)
  from '../../../../lib/prisma'  (✅ correct)

Solución: Contar niveles correctamente
```

### 3. **Missing Environment Variables**

```
⚠ Some env variables might be undefined

Solución: Verificar .env.local
```

### 4. **Build Cache Issues**

```
✗ Build FAILED (cache issue)

Solución: Limpiar .next/
```

## 📈 Monitoreo en Tiempo Real

Después de hacer `git push`, monitorear en:

```
https://vercel.com/dashboard
Proyecto: verifactu-monorepo
```

O ver logs con:

```bash
vercel logs <deployment-url>
```

## 🎯 Próximas Mejoras de ISAAK

- [ ] Integración con Vercel API para revisar logs directamente
- [ ] Auto-fix para más tipos de errores
- [ ] Slack notifications de builds
- [ ] Dashboard web con histórico de reports
- [ ] Predicción de errores antes de compilar

## 📞 Troubleshooting

### "Permission denied" en scripts

```bash
chmod +x scripts/isaak.sh
chmod +x scripts/isaak-diagnostics.sh
chmod +x scripts/isaak-auto-fixer.sh
chmod +x scripts/fix-prisma.sh
```

### Script no encuentra pnpm

```bash
# Asegúrate de tener pnpm instalado
npm install -g pnpm@10.27.0

# O usa:
npx -y pnpm@10.27.0 install
```

### Reporte vacío

```bash
# Si el reporte está vacío, probablemente:
# 1. Revisa permisos de escritura en .isaak/
# 2. Asegúrate de ejecutar desde raíz del monorepo
# 3. Intenta: mkdir -p .isaak/reports
```

## 🔗 Relacionado

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
- [AI Gateway Integration](../engineering/ai/AI_GATEWAY_STATUS.md)
- [Build Error Fixes](./)

## ✅ Checklist de Uso

- [ ] Has ejecutado `./scripts/isaak.sh` antes de cada push
- [ ] Revisaste el reporte en `.isaak/reports/`
- [ ] Todos los builds reportan OK
- [ ] Git working directory está limpio
- [ ] Vas a hacer push a `main`

---

**Última actualización**: 2024-01-13  
**Status**: 🟢 Listo para usar  
**Orquestador**: GitHub Copilot como Isaak
