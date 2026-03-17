# 🔧 Instrucciones de Aplicación de Migraciones

## Tabla de Respuestas de Email

Para activar la funcionalidad completa de responder emails desde soporte@verifactu.business necesitas aplicar una migración a tu base de datos.

---

## ✅ Opción 1: Aplicar manualmente con psql (Recomendado)

### En Windows PowerShell:

```powershell
# 1. Asegúrate de estar en el directorio del proyecto
cd c:\dev\verifactu-monorepo

# 2. Conectarse a la BD y aplicar migración
psql "$env:DATABASE_URL" -f "db/migrations/003_add_email_responses_table.sql"

# 3. Verificar que se creó
psql "$env:DATABASE_URL" -c "SELECT * FROM information_schema.tables WHERE table_name = 'admin_email_responses';"
```

### En Linux/Mac:

```bash
# 1. Ir al directorio
cd /path/to/verifactu-monorepo

# 2. Aplicar migración
psql "$DATABASE_URL" -f "db/migrations/003_add_email_responses_table.sql"

# 3. Verificar
psql "$DATABASE_URL" -c "SELECT * FROM information_schema.tables WHERE table_name = 'admin_email_responses';"
```

---

## ✅ Opción 2: Aplicar desde pgAdmin o DBeaver

1. **Abre tu cliente PostgreSQL** (pgAdmin, DBeaver, etc.)
2. **Copia el contenido de:**
   ```
   db/migrations/003_add_email_responses_table.sql
   ```
3. **Pégalo en el editor SQL**
4. **Ejecuta** (Ctrl+Enter o botón Run)

---

## ✅ Opción 3: Crear tabla manualmente

Si no tienes psql disponible, ejecuta este SQL directamente:

```sql
-- Crear tabla de respuestas
CREATE TABLE IF NOT EXISTS admin_email_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email_id UUID NOT NULL REFERENCES admin_emails(id) ON DELETE CASCADE,
  response_email_id TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  from_email TEXT NOT NULL DEFAULT 'soporte@verifactu.business',
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_admin_email_responses_email_id 
  ON admin_email_responses(admin_email_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_responses_sent_at 
  ON admin_email_responses(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_email_responses_response_id 
  ON admin_email_responses(response_email_id);

-- Agregar columnas a tabla existente
ALTER TABLE admin_emails 
ADD COLUMN IF NOT EXISTS response_email_id TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_admin_emails_responded_at 
  ON admin_emails(responded_at DESC);
```

---

## ✅ Verificar que Funcionó

Una vez aplicada la migración, verifica:

```sql
-- Contar respuestas
SELECT COUNT(*) FROM admin_email_responses;

-- Ver estructura
\d admin_email_responses

-- Ver índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'admin_email_responses';
```

**Resultado esperado:**
```
 Column          | Type                     | Modifiers
─────────────────┼──────────────────────────┼──────────
 id              | uuid                     | not null, primary key
 admin_email_id  | uuid                     | not null
 response_email_id | text                   | not null, unique
 sent_at         | timestamp with time zone | not null
 from_email      | text                     | not null
 to_email        | text                     | not null
 subject         | text                     | not null
 content         | text                     | not null
 created_at      | timestamp with time zone | default now()
```

---

## ✅ Reiniciar y Probar

1. **Reinicia tu servidor:**
   ```bash
   pnpm dev
   ```

2. **Abre la aplicación:**
   ```
   http://localhost:3000/dashboard/admin/emails
   ```

3. **Prueba responder un email:**
   - Selecciona un email (o envía uno de prueba primero)
   - Haz click en "Responder desde soporte@verifactu.business"
   - Escribe tu respuesta
   - Haz click en "Enviar respuesta"

---

## ❌ Troubleshooting

### Error: "psql: command not found"

**Solución:**
- Instala PostgreSQL: https://www.postgresql.org/download/
- O usa pgAdmin/DBeaver para ejecutar el SQL manualmente

### Error: "relation \"admin_emails\" does not exist"

**Posible causa:** La tabla `admin_emails` no existe aún

**Solución:**
- Primero debes tener los emails configurados
- Ejecuta las migraciones anteriores:
  - `db/migrations/003_create_emails_table.sql`

### Error: "Foreign key constraint failed"

**Solución:**
- Asegúrate que `admin_emails` tabla existe primero
- Ejecuta en orden:
  1. `003_create_emails_table.sql`
  2. `003_add_email_responses_table.sql`

---

**Estado:** ✅ Implementado y listo  
**Última actualización:** Enero 19, 2026  
**Soporte:** Revisar docs/MAILBOX_ADMIN_CONFIGURATION.md
