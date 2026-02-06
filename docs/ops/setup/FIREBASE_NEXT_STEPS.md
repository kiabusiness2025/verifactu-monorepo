# ✅ Firebase Configurado - Próximos Pasos

Tu proyecto Firebase **verifactu-business** está creado y las credenciales están integradas.

**Status:** ✅ Credenciales configuradas en `.env.local`

---

## 🎯 Pasos Inmediatos (en Firebase Console)

### 1️⃣ Habilitar Email/Password Sign-in

En https://console.firebase.google.com:

1. Ir a **Authentication** (en el menú izquierdo)
2. Click en **Sign-in method** (pestaña)
3. Encontrar **Email/Password**
4. Click en el ícono de editar (lápiz)
5. Habilitar **Email/Password**
6. Habilitar también **Email link sign-in** (opcional pero recomendado)
7. Click **Save**

**Resultado esperado:** Email/Password con ✅ estado Habilitado

---

### 2️⃣ Habilitar Google Sign-in

En la misma página **Authentication > Sign-in method**:

1. Encontrar **Google**
2. Click en el ícono de editar
3. Habilitar **Google**
4. Seleccionar **Project support email** (tuyo o verifactu@...)
5. Click **Save**

**Resultado esperado:** Google con ✅ estado Habilitado

---

### 3️⃣ Autorizar Dominios de Desarrollo

En **Authentication > Settings**:

Ir a la sección **Authorized domains** y agregar:

```
localhost
127.0.0.1
localhost:3000
localhost:3001
```

Click **Add URL** para cada uno.

**Resultado esperado:** 4-5 dominios locales autorizados

---

### 4️⃣ Personalizar Email Templates (Opcional)

En **Authentication > Templates**:

Puedes personalizar los emails de:

- ✉️ Verificación de email
- 🔑 Reset de contraseña

Por ahora puedes dejarlos por defecto. Firebase envía emails automáticamente.

---

## 🧪 Testing Local

Una vez hayas hecho los pasos anteriores:

### A. Acceder a Signup

```
http://localhost:3001/auth/signup
```

### B. Crear Cuenta de Prueba

```
Email: test@example.com
Contraseña: TestPassword123!
```

### C. Verificar Email

1. Firebase enviará email automático
2. Revisa tu inbox (o spam)
3. Haz clic en link de verificación
4. Página detectará automáticamente
5. Redirige al dashboard

### D. Probar Login

```
http://localhost:3001/auth/login
```

Usa las mismas credenciales

### E. Probar Google OAuth

1. Click "Continuar con Google"
2. Selecciona tu cuenta Google
3. Autoriza acceso
4. Login automático

### F. Probar Reset Password

```
http://localhost:3001/auth/forgot-password
```

---

## 📋 Checklist de Validación

- [ ] Email/Password habilitado en Firebase Console
- [ ] Google Sign-in habilitado
- [ ] Dominios localhost autorizados
- [ ] Dev server corriendo: `npm run dev --port 3001`
- [ ] Signup funciona
- [ ] Email de verificación llega
- [ ] Login funciona
- [ ] Google OAuth funciona
- [ ] Reset password funciona
- [ ] Logout funciona

---

## 🚨 Si Hay Problemas

### Error: "Firebase: Error (auth/..."

**Solución:** Verifica que .env.local tiene todas las variables correctas

### Email no llega

**Solución:**

- Revisa carpeta Spam
- Verifica email en tu cuenta Gmail
- Espera 2-3 minutos

### Google popup no abre

**Solución:**

- Verifica que localhost:3001 está en Authorized domains
- Revisa Chrome DevTools > Network
- Recarga la página

### Error "Domain not authorized"

**Solución:** Agrega localhost:3001 a Authorized domains en Firebase Console

---

## 📱 Testear en Móvil (Opcional)

Para probar desde tu teléfono:

1. Obtén tu IP local:

```bash
ipconfig | findstr "IPv4"
```

2. Abre en móvil:

```
http://192.168.X.X:3001/auth/signup
```

3. Agrega la IP a **Authorized domains** en Firebase Console si es necesario

---

## ✨ Próximo: Deploy a Vercel

Una vez todo funcione localmente:

1. Commit y push (ya está todo en main)
2. En Vercel Dashboard → Environment Variables
3. Agregar las 6 variables NEXT*PUBLIC_FIREBASE*\*
4. Deploy automático
5. Agregar `verifactu.business` a Authorized domains en Firebase

---

## 📞 Comandos Útiles

```bash
# Ver logs en tiempo real
cd apps/landing
npm run dev -- --port 3001

# Ver credenciales configuradas (sin mostrarlas)
cat .env.local | grep NEXT_PUBLIC_FIREBASE

# Build de producción
npm run build

# Limpiar cache
rm -rf .next node_modules
npm install
```

---

## 🎉 Estatus Actual

✅ Firebase proyecto creado: **verifactu-business**
✅ Credenciales integradas en `.env.local`
✅ Dev server funcionando en **localhost:3001**
✅ Código de auth completamente implementado
✅ Falta: Habilitar métodos en Firebase Console (5 minutos)

**Una vez completes los 4 pasos anteriores, todo estará 100% funcional!**

---

**Necesitas ayuda con alguno de estos pasos? Pregunta y te ayudo! 🚀**
