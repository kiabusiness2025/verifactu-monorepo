# Configuración de Vercel API Token

El panel de administración necesita acceso a la API de Vercel para monitorear deployments y proyectos.

## 📋 Crear Token de Vercel

### 1. Acceder a Vercel Dashboard

1. Ve a [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click en **"Create Token"**

### 2. Configurar el token

**Token Name:** `Verifactu Admin Panel`  
**Scope:** `Full Account Access` (o limita por team)  
**Expiration:** `No Expiration` o `1 year`

### 3. Copiar y guardar

1. Click en **"Create"**
2. Copia el token
3. Guárdalo en `apps/admin/.env.local`:

```bash
VERCEL_TOKEN="tu_token_aqui"
VERCEL_TEAM_ID="team_VKgEl6B4kMmqwaplJcykx3KP"
```

### 4. Obtener Team ID (si aplica)

Si trabajas con un team de Vercel:

```bash
# Usando Vercel CLI
vercel teams ls

# O consulta la API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.vercel.com/v2/teams
```

## 🧪 Probar el token

```bash
# Test simple
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.vercel.com/v6/deployments?limit=1
```

Debe retornar JSON con deployments recientes.

## 🔐 Seguridad

- ⚠️ Nunca commitees el token
- 🔄 Rota tokens regularmente
- 📝 Revoca tokens viejos
- 🔒 Usa scope mínimo necesario

---

✅ Token configurado. El admin panel puede monitorear deploys de Vercel.
