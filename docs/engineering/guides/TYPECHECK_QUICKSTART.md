# ⚡ Guía Rápida - Sistema de Verificación TypeScript

## 🚀 Uso Rápido

### Antes de hacer commit:
```bash
pnpm run typecheck
```

### Instalar verificación automática:
```bash
pnpm run install-hooks
```

### Si hay errores en Vercel:
1. El workflow **bloqueará el deploy automáticamente**
2. Revisa los logs en GitHub Actions
3. Corrige los errores localmente
4. Haz push de nuevo

## 📋 Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm run typecheck` | Verifica TypeScript en todo el proyecto |
| `pnpm run typecheck:app` | Verifica solo el app |
| `pnpm run precommit` | Ejecuta verificación pre-commit |
| `pnpm run install-hooks` | Instala hook de pre-commit |

## 🛡️ Protecciones Activas

✅ **Pre-commit Hook** - Bloquea commits con errores  
✅ **GitHub Actions TypeCheck** - Verifica cada push  
✅ **Deploy Blocker** - Previene deploys con errores  
✅ **Isaak Auto-Fix** - Corrige errores comunes automáticamente

## 📚 Documentación Completa

Ver [TYPECHECK_SYSTEM.md](TYPECHECK_SYSTEM.md) para detalles completos.

---

**Status:** ✅ Activo  
**Última actualización:** Enero 2026
