# Guía de Páginas de Autenticación

## 🎯 Visión General

Se han implementado todas las páginas de autenticación con un diseño moderno, responsive y optimizado para móvil. El landing ahora incluye un menú hamburguesa elegante en dispositivos móviles.

## 📱 Menú Responsivo (Header)

### Componente: `Header.tsx`

**Ubicación**: `apps/landing/app/components/Header.tsx`

**Características:**

- Logo con gradiente azul (VF)
- Navegación horizontal en desktop
- Menú hamburguesa en móvil con animación smooth
- Botón "Acceder" siempre visible (destacado)
- Links a: Características, Precios, FAQ, Docs

**Breakpoints:**

- **Desktop (md+)**: Navegación horizontal completa
- **Mobile (<md)**: Menú hamburguesa + botón Acceder

**Animaciones:**

- Menú slide-in/out con framer-motion
- Transiciones suaves en hover
- Gradientes en botones

---

## 🔐 Páginas de Autenticación

### 1️⃣ Login (Iniciar Sesión)

**URL**: `/auth/login`  
**Archivo**: `apps/landing/app/(auth)/login/page.tsx`

**Formulario:**

```
✓ Email
✓ Contraseña (con toggle visibility)
✓ Link "¿Olvidaste tu contraseña?"
✓ Botón "Iniciar sesión"
```

**Autenticación:**

- Google OAuth (botón + icono)
- Email + Contraseña

**Links adicionales:**

- "¿No tienes cuenta? Regístrate aquí" → `/auth/signup`
- "¿Olvidaste tu contraseña?" → `/auth/forgot-password`

---

### 2️⃣ Signup (Registrarse)

**URL**: `/auth/signup`  
**Archivo**: `apps/landing/app/(auth)/signup/page.tsx`

**Formulario:**

```
✓ Nombre completo
✓ Correo electrónico
✓ Contraseña (validación: min 8 caracteres)
✓ Confirmar contraseña
✓ Checkbox términos y condiciones
✓ Botón "Crear cuenta"
```

**Validaciones:**

- Email válido
- Contraseña mínimo 8 caracteres
- Contraseñas coinciden
- Términos aceptados

**Autenticación:**

- Google OAuth
- Email + Contraseña

**Links adicionales:**

- "¿Ya tienes cuenta? Inicia sesión aquí" → `/auth/login`
- Términos y condiciones → `/terms`
- Política de privacidad → `/privacy`

---

### 3️⃣ Recuperar Contraseña

**URL**: `/auth/forgot-password`  
**Archivo**: `apps/landing/app/(auth)/forgot-password/page.tsx`

**Flujo Multi-paso:**

**Paso 1: Solicitud**

```
✓ Ingresa tu correo
✓ Botón "Enviar enlace"
→ Transición a Paso 2
```

**Paso 2: Confirmación**

```
✓ Código de 6 dígitos (enviado por email)
✓ Nueva contraseña
✓ Botón "Actualizar contraseña"
→ Redirección a login
```

**Links adicionales:**

- Volver a login
- No recibiste código → Reintentar

---

## 🎨 Componentes Reutilizables

**Archivo**: `apps/landing/app/components/AuthComponents.tsx`

### `FormInput`

```typescript
<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="tu@email.com"
  error={emailError}
  required
/>
```

**Características:**

- Label, placeholder, validación
- Error messages en rojo
- Estilos Tailwind consistentes

### `PasswordInput`

```typescript
<PasswordInput
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Contraseña"
/>
```

**Características:**

- Toggle visibility (Eye/EyeOff icon)
- Mascara de contraseña por defecto
- Icono clickeable en la derecha

### `GoogleAuthButton`

```typescript
<GoogleAuthButton />
```

**Características:**

- Icono SVG de Google
- Texto: "Continuar con Google"
- Estilos de borde neutral

### `AuthLayout`

```typescript
<AuthLayout
  title="Inicia sesión"
  subtitle="Accede a tu cuenta"
  footerText="¿No tienes cuenta?"
  footerLink={{ href: "/auth/signup", label: "Regístrate" }}
>
  {/* Formulario */}
</AuthLayout>
```

**Características:**

- Card centrada en pantalla
- Logo VF en el centro
- Fondo gradiente gris
- Footer con link de navegación
- Mensaje de confianza: "Tu contabilidad nunca se pierde"

---

## 🎨 Diseño Visual

### Colores

- **Primario**: Azul (`from-blue-600 to-blue-700`)
- **Hover**: Azul más oscuro (`from-blue-700 to-blue-800`)
- **Fondo**: Blanco y gris claro
- **Borders**: Gris `#e5e7eb`
- **Text**: Gris oscuro (primario), gris medio (secundario)

### Tipografía

- **Títulos**: Bold, 24px (`text-2xl font-bold`)
- **Labels**: Medium, 14px (`text-sm font-medium`)
- **Body**: Regular, 16px (`text-base`)
- **Helper**: Small, 12px (`text-xs`)

### Espaciado

- Cards: 32px padding (`p-8`)
- Inputs: 12px padding (`py-3 px-4`)
- Gaps: 16px-24px
- Bordes: 8px radius (`rounded-lg`), 16px (`rounded-2xl`) cards

### Responsive

- **Mobile**: Full width, 16px padding horizontal
- **Desktop**: Max 448px width card
- **Breakpoint**: `md` (768px)

---

## 🚀 Próximos Pasos

### Firebase Integration

Cada página está lista para integrarse con Firebase Auth:

```typescript
// En cada página
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
  // TODO: Conectar con Firebase
  // const result = await createUserWithEmailAndPassword(auth, email, password);
  // signInWithGoogle(auth);
};
```

### Variables de entorno requeridas

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### Testing

```bash
# Local
npm run dev

# Ver en móvil
# iPhone: http://localhost:3001
# Android: http://192.168.x.x:3001
```

---

## 📊 Estructura de Archivos

```
apps/landing/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          # Layout para grupo de rutas auth
│   │   ├── login/
│   │   │   └── page.tsx        # Página de login
│   │   ├── signup/
│   │   │   └── page.tsx        # Página de registro
│   │   └── forgot-password/
│   │       └── page.tsx        # Página recuperar contraseña
│   ├── components/
│   │   ├── Header.tsx          # Menú responsive
│   │   ├── AuthComponents.tsx  # Componentes reutilizables
│   │   └── ... otros
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── next.config.js
└── tsconfig.json
```

---

## ✅ Checklist de Validación

- [x] Menú hamburguesa en móvil
- [x] Navegación horizontal en desktop
- [x] Página de login con Google + Email
- [x] Página de signup con validaciones
- [x] Página de recuperar contraseña (multi-paso)
- [x] Componentes auth reutilizables
- [x] Password visibility toggle
- [x] AuthLayout centrado con card
- [x] Responsive en móvil y desktop
- [x] Build exitoso (npm run build)
- [x] Dev server funcional (npm run dev)
- [x] Cambios pusheados a GitHub

---

## 🔒 Mensajes de Seguridad

Cada página incluye un mensaje de confianza:

> 🔐 **Tu contabilidad nunca se pierde.** Todos los datos se almacenan de forma segura en Google Cloud.

---

## 📸 URLs de Prueba Local

Si ejecutas `npm run dev --port 3001`:

| Página               | URL                                        |
| -------------------- | ------------------------------------------ |
| Landing              | http://localhost:3001                      |
| Login                | http://localhost:3001/auth/login           |
| Signup               | http://localhost:3001/auth/signup          |
| Recuperar Contraseña | http://localhost:3001/auth/forgot-password |

---

**Última actualización**: Diciembre 2024  
**Estado**: ✅ Completado y pusheado a main
