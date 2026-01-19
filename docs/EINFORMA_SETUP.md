# Configuración de eInforma

## Descripción

eInforma es una API de consulta de información de empresas españolas. Se utiliza en Verifactu para:

- Buscar empresas por nombre o NIF
- Autocompletar datos de empresas al crear nuevos tenants
- Validar y enriquecer información de empresas

## Variables de Entorno Requeridas

Agrega estas variables en:

1. Archivo `.env.local` en la raíz del monorepo
2. Archivo `apps/app/.env.local`
3. Panel de Vercel del proyecto `app` (Settings → Environment Variables)

```env
# eInforma OAuth2 Token URL para autenticación
EINFORMA_TOKEN_URL=https://api.einforma.com/oauth/token

# eInforma API Base URL
EINFORMA_API_BASE_URL=https://api.einforma.com/v1

# eInforma OAuth2 Credentials (obtener de eInforma)
EINFORMA_CLIENT_ID=your_client_id_here
EINFORMA_CLIENT_SECRET=your_client_secret_here

# Request timeout en milisegundos (opcional, por defecto: 8000)
EINFORMA_TIMEOUT_MS=8000
```

## Cómo Obtener las Credenciales

1. **Contratar el servicio de eInforma**:
   - Contactar con eInforma (https://www.einforma.com)
   - Solicitar acceso a su API de consulta de empresas
   - Obtener credenciales OAuth2 (Client ID y Client Secret)

2. **Configurar las credenciales**:
   - Reemplaza `your_client_id_here` con tu Client ID
   - Reemplaza `your_client_secret_here` con tu Client Secret
   - Verifica que las URLs de token y API sean correctas

3. **Agregar en Vercel**:
   - Ve a tu proyecto en Vercel Dashboard
   - Settings → Environment Variables
   - Agrega las 4 variables principales (TOKEN_URL, API_BASE_URL, CLIENT_ID, CLIENT_SECRET)
   - Aplica a los entornos: Production, Preview, Development

## Uso en el Código

### Búsqueda de Empresas

```typescript
import { searchCompanies } from '@/server/einforma';

const results = await searchCompanies('Empresa SL');
// Retorna: Array<{ name, nif, province, id }>
```

### Perfil de Empresa por NIF

```typescript
import { getCompanyProfileByNif } from '@/server/einforma';

const profile = await getCompanyProfileByNif('B12345678');
// Retorna: { name, legalName, nif, cnae, address, constitutionDate, representatives }
```

## Endpoints API

### GET /api/einforma/search

Busca empresas por nombre o NIF.

**Query params**:

- `q`: Término de búsqueda (mínimo 3 caracteres)

**Response**:

```json
{
  "items": [
    {
      "name": "Empresa Example SL",
      "nif": "B12345678",
      "province": "Madrid",
      "id": "123456"
    }
  ]
}
```

### GET /api/einforma/profile

Obtiene el perfil completo de una empresa por NIF.

**Query params**:

- `nif`: NIF de la empresa

**Response**:

```json
{
  "profile": {
    "name": "Empresa Example SL",
    "legalName": "Empresa Example Sociedad Limitada",
    "nif": "B12345678",
    "cnae": "6201",
    "address": {
      "street": "Calle Example 123",
      "zip": "28001",
      "city": "Madrid",
      "province": "Madrid",
      "country": "ES"
    },
    "constitutionDate": "2020-01-15",
    "representatives": [
      {
        "name": "Juan Pérez",
        "role": "Administrador Único"
      }
    ]
  }
}
```

## Integración en la UI

La búsqueda de eInforma se integra en:

1. **Modal de Crear Empresa** (`CreateCompanyModal.tsx`):
   - Campo de búsqueda con autocompletado
   - Al escribir 3+ caracteres, busca en eInforma
   - Al seleccionar una empresa, autocompleta nombre y NIF

2. **Uso**:
   ```typescript
   // El componente ya está integrado
   // Solo necesitas configurar las variables de entorno
   ```

## Manejo de Errores

### Error: Missing env var EINFORMA_TOKEN_URL

**Causa**: Variable no configurada
**Solución**: Agrega la variable en `.env.local`

### Error: eInforma token error 401

**Causa**: Credenciales incorrectas
**Solución**: Verifica CLIENT_ID y CLIENT_SECRET

### Error: eInforma API error 403

**Causa**: Suscripción expirada o límite de requests alcanzado
**Solución**: Contacta con eInforma para verificar tu cuenta

### Error: Request timeout

**Causa**: API de eInforma lenta o no disponible
**Solución**: Incrementa EINFORMA_TIMEOUT_MS o verifica el estado del servicio

## Modo Desarrollo sin eInforma

Si no tienes credenciales de eInforma en desarrollo:

1. El formulario de crear empresa funcionará sin autocompletado
2. Deberás introducir manualmente el nombre y NIF de la empresa
3. Los endpoints `/api/einforma/*` retornarán errores 500 (esperado)

## Seguridad

⚠️ **IMPORTANTE**:

- Las credenciales de eInforma son **PRIVADAS**
- Nunca expongas CLIENT_ID o CLIENT_SECRET en el navegador
- Los endpoints `/api/einforma/*` verifican autenticación del usuario
- El acceso está protegido por sesión de usuario

## Testing

Para probar la integración de eInforma:

1. Configura las variables de entorno
2. Reinicia el servidor de desarrollo
3. Ve a Dashboard → Crear Nueva Empresa
4. Escribe el nombre de una empresa española
5. Deberías ver sugerencias después de 3 caracteres

## Cache de Tokens

El módulo `einforma.ts` cachea los tokens OAuth2:

- Token se renueva automáticamente antes de expirar
- Cache válido por la duración indicada por eInforma (típicamente 1 hora)
- No requiere configuración adicional

## Límites y Costos

- eInforma cobra por consultas/requests
- Implementa debounce en búsquedas (300ms) para reducir requests
- Monitoriza el uso en tu cuenta de eInforma
- Considera implementar cache de resultados si haces consultas frecuentes

## Recursos Adicionales

- [Documentación oficial de eInforma API](https://www.einforma.com/api-docs)
- [OAuth2 Client Credentials Flow](https://oauth.net/2/grant-types/client-credentials/)
- Código fuente: `apps/app/server/einforma.ts`
- API routes: `apps/app/app/api/einforma/`
