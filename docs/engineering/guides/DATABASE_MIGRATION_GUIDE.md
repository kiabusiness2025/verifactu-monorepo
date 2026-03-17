# 📦 Aplicar Migraciones de Base de Datos

## Nueva Funcionalidad: Respuestas de Email desde Admin

Para que funcione completamente el buzón de correo con respuestas, debes aplicar la migración:

### Archivo:
```
db/migrations/003_add_email_responses_table.sql
```

### Pasos para Aplicar

#### Opción 1: Desde psql (Recomendado)

```bash
# Conectarse a la BD
psql -h [HOST] -U [USER] -d [DATABASE]

# Aplicar migración
\i db/migrations/003_add_email_responses_table.sql

# Verificar que se creó correctamente
\dt admin_email_responses
\dt admin_emails
```

#### Opción 2: Desde un cliente SQL (pgAdmin, DataGrip, etc.)

1. Abre la conexión a tu base de datos PostgreSQL
2. Copia el contenido de `db/migrations/003_add_email_responses_table.sql`
3. Pégalo en el editor de SQL
4. Ejecuta (Ctrl+Enter o botón Run)

#### Opción 3: Script Automático

```bash
# Para agregar al inicio automático del proyecto:
npm run db:migrate
# (Si existe este script configurado)
```

### Verificar Aplicación

Una vez aplicada, verifica que las tablas existen:

```sql
-- Ver tabla de respuestas
SELECT * FROM information_schema.tables 
WHERE table_name = 'admin_email_responses';

-- Ver tabla de emails
SELECT * FROM information_schema.tables 
WHERE table_name = 'admin_emails';

-- Ver columnas de respuestas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_email_responses'
ORDER BY ordinal_position;

-- Ver índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'admin_email_responses';
```

### Resultado Esperado

```
 admin_email_responses - Tabla para guardar respuestas
 ├─ id (UUID)
 ├─ admin_email_id (UUID - FK)
 ├─ response_email_id (TEXT)
 ├─ sent_at (TIMESTAMP)
 ├─ from_email (TEXT)
 ├─ to_email (TEXT)
 ├─ subject (TEXT)
 ├─ content (TEXT)
 └─ created_at (TIMESTAMP)

 admin_emails - Tabla existente se agrega:
 ├─ response_email_id (TEXT - nueva)
 └─ responded_at (TIMESTAMP - nueva)

Índices:
 ├─ idx_admin_email_responses_email_id
 ├─ idx_admin_email_responses_sent_at
 ├─ idx_admin_email_responses_response_id
 └─ idx_admin_emails_responded_at
```

### Después de Aplicar

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   pnpm dev
   ```

2. Prueba la funcionalidad:
   - Ve a `/dashboard/admin/emails`
   - Selecciona un email
   - Haz click en "Responder desde soporte@verifactu.business"
   - Envía una prueba

3. Verifica que se guardó:
   ```sql
   SELECT * FROM admin_email_responses 
   ORDER BY sent_at DESC LIMIT 1;
   ```

### Troubleshooting

**Error: "Table already exists"**
- Normal si la migración ya fue aplicada
- Verifica que los datos están intactos

**Error: "Foreign key constraint failed"**
- Asegúrate que la tabla `admin_emails` existe
- Ejecuta: `SELECT * FROM admin_emails LIMIT 1;`

**Error: "Column already exists" (responded_at)**
- Ya fue aplicada anteriormente
- Verifica el estado actual de la tabla

---

**Fecha de Creación:** Enero 19, 2026  
**Versión:** 1.0  
**Estado:** ✅ Listo para producción
