# 📧 Guía Rápida de Inicio - Buzón de Correo Admin

## 🎯 ¿Qué acabo de implementar?

Un sistema completo para gestionar el buzón de correo corporativo desde el panel de administración:

- ✅ **Ver bandeja de entrada** - Recibe emails automáticamente en soporte@verifactu.business
- ✅ **Enviar respuestas** - Responde directamente desde soporte@verifactu.business
- ✅ **Gestionar estado** - Marca como pendiente, respondido o archivado
- ✅ **Historial completo** - Almacena todas las comunicaciones

---

## 🚀 Inicio Rápido (5 minutos)

### Paso 1: Aplicar Migraciones de Base de Datos

**En Windows PowerShell:**

```powershell
# Ir a tu carpeta del proyecto
cd c:\dev\verifactu-monorepo

# Ejecutar migración
psql "$env:DATABASE_URL" -f "db/migrations/003_add_email_responses_table.sql"

# Verificar (deberías ver "admin_email_responses")
psql "$env:DATABASE_URL" -c "SELECT * FROM information_schema.tables WHERE table_name = 'admin_email_responses';"
```

**En Mac/Linux:**

```bash
cd /path/to/verifactu-monorepo

psql "$DATABASE_URL" -f "db/migrations/003_add_email_responses_table.sql"

psql "$DATABASE_URL" -c "SELECT * FROM information_schema.tables WHERE table_name = 'admin_email_responses';"
```

**Resultado esperado:**
```
 schemaname | tablename                | tableowner
─────────────┼──────────────────────────┼───────────
 public      | admin_email_responses    | user
```

### Paso 2: Reiniciar Servidor

```bash
pnpm dev
```

Espera hasta que veas:
```
✓ Ready in XXX ms
```

### Paso 3: Acceder al Panel

Abre tu navegador:
```
http://localhost:3000/dashboard/admin/emails
```

Deberías ver:
- 📥 Tab "Bandeja de entrada"
- 🧪 Tab "Testing"

### Paso 4: Probar Funcionalidad

#### Opción A: Enviar email de prueba

1. Haz click en Tab "Testing"
2. Escribe un email de prueba (por defecto: expertestudiospro@gmail.com)
3. Selecciona tipo: "Todos los emails (5)"
4. Haz click en "Enviar Email de Prueba"
5. Espera confirmación verde ✅

#### Opción B: Ver emails existentes

Si ya tienes emails en la bandeja:
1. Haz click en Tab "Bandeja de entrada"
2. Deberías ver emails listados por fecha

### Paso 5: Responder un Email

1. **Selecciona un email** de la lista izquierda
2. **En el panel derecho**, haz click en:
   ```
   "Responder desde soporte@verifactu.business"
   ```
3. **Se abre un modal** con:
   - Desde: `soporte@verifactu.business` (no editable)
   - Para: `usuario@ejemplo.com` (auto)
   - Asunto: `Re: ...` (editable)
   - Mensaje: Tu respuesta (vacío, escribe aquí)

4. **Escribe tu respuesta**, por ejemplo:
   ```
   Hola,

   Gracias por contactar a Verifactu. 
   Hemos recibido tu mensaje y te responderemos pronto.

   Saludos,
   Equipo Verifactu
   ```

5. **Haz click en "Enviar respuesta"**
   - Espera a que termine (verás "Enviando...")
   - Deberías ver confirmación verde ✅

6. **El email cambia automáticamente a "Respondido"** ✅

---

## 🧪 Verificar que Funcionó

### Script de Prueba Automático

```bash
node scripts/test-email-responses.js
```

Debería mostrar:
- ✅ GET /api/admin/emails - Obtener lista
- ✅ POST /api/admin/emails/send - Enviar respuesta  
- ✅ GET /api/admin/emails/send?emailId=... - Obtener respuestas

### Verificación Manual en BD

```sql
-- Conectarse a BD
psql "$DATABASE_URL"

-- Ver tabla de respuestas
SELECT * FROM admin_email_responses ORDER BY sent_at DESC LIMIT 5;

-- Ver emails con respuestas
SELECT id, subject, status, responded_at 
FROM admin_emails 
WHERE responded_at IS NOT NULL 
ORDER BY responded_at DESC;
```

---

## 📁 Archivos Modificados/Creados

### Nuevos Archivos:

1. **API Endpoint**
   ```
   apps/app/app/api/admin/emails/send/route.ts
   ```
   - POST para enviar respuestas
   - GET para obtener historial de respuestas

2. **Migración BD**
   ```
   db/migrations/003_add_email_responses_table.sql
   ```
   - Tabla `admin_email_responses`
   - Índices para performance

3. **Documentación**
   - `docs/MAILBOX_ADMIN_CONFIGURATION.md` - Guía completa
   - `docs/APPLY_MIGRATIONS.md` - Pasos de BD
   - `docs/DATABASE_MIGRATION_GUIDE.md` - Técnica
   - `MAILBOX_IMPLEMENTATION_SUMMARY.md` - Resumen

4. **Scripts**
   - `scripts/test-email-responses.js` - Testing

### Archivos Modificados:

1. **Panel UI**
   ```
   apps/app/app/dashboard/admin/emails/page.tsx
   ```
   - Nuevo modal de respuesta
   - Botón "Responder desde soporte@verifactu.business"
   - Estado y manejo de errores

---

## ❌ Troubleshooting

### Error: "psql: command not found"

```bash
# En Windows: Instala PostgreSQL
# https://www.postgresql.org/download/windows/

# En Mac con Homebrew:
brew install postgresql@15

# En Linux:
sudo apt-get install postgresql-client
```

### Error: "relation \"admin_email_responses\" does not exist"

```bash
# Aplicar migración nuevamente
psql "$env:DATABASE_URL" -f "db/migrations/003_add_email_responses_table.sql"
```

### "Failed to send email" en UI

**Verificar en Vercel:**
1. Ve a: https://vercel.com/ksenias-projects-16d8d1fb/verifactu-app
2. Settings → Environment Variables
3. Verifica que `RESEND_API_KEY` existe

**Ver logs:**
```bash
vercel logs --prod
# Busca: "Error sending response email"
```

### Modal no aparece al hacer click

```javascript
// En browser console (F12):
localStorage.clear();
location.reload();
```

### Email no se marca como respondido

```sql
-- Verificar estructura de tabla
\d admin_emails

-- Debería mostrar columnas: responded_at, response_email_id
```

---

## 📚 Documentación Completa

Para información detallada, consulta:

- **[MAILBOX_ADMIN_CONFIGURATION.md](docs/MAILBOX_ADMIN_CONFIGURATION.md)**
  - Guía de usuario completa
  - Información de API endpoints
  - Seguridad y auditoría

- **[APPLY_MIGRATIONS.md](docs/APPLY_MIGRATIONS.md)**
  - 3 formas de aplicar migración
  - SQL directo
  - Troubleshooting BD

- **[MAILBOX_IMPLEMENTATION_SUMMARY.md](MAILBOX_IMPLEMENTATION_SUMMARY.md)**
  - Cambios técnicos realizados
  - Arquitectura
  - Roadmap

---

## 🔐 Seguridad

✅ **Autenticación:**
- Solo admins pueden enviar emails (ADMIN_EMAILS)
- Requiere sesión válida

✅ **Auditoría:**
- Se registra quién respondió
- Cuándo se envió la respuesta
- ID de mensaje de Resend

✅ **Validación:**
- Campos obligatorios verificados
- SQL injection prevenido (prepared statements)
- Tokens CSRF integrados

---

## 🚀 Próximos Pasos (Opcional)

Cuando todo funcione, puedes:

1. **Ir a producción:**
   ```bash
   vercel --prod
   ```

2. **Ver logs en producción:**
   ```bash
   vercel logs --prod --app=verifactu-app
   ```

3. **Configurar en Vercel:**
   - Settings → Environment Variables
   - Asegúrate que `RESEND_API_KEY` y `ADMIN_EMAILS` están

4. **Probar en producción:**
   ```
   https://app.verifactu.business/dashboard/admin/emails
   ```

---

## 📞 Soporte

Si algo no funciona:

1. Revisar esta guía
2. Ver logs: `pnpm dev` output
3. Ejecutar test: `node scripts/test-email-responses.js`
4. Verificar BD: `SELECT * FROM admin_email_responses;`
5. Revisar docs en `docs/MAILBOX_ADMIN_CONFIGURATION.md`

---

**¡Listo!** ✅

Ya puedes gestionar emails desde el panel admin. 

Cualquier pregunta, revisa la documentación en `/docs` o los comentarios en el código.

**Última actualización:** Enero 19, 2026
