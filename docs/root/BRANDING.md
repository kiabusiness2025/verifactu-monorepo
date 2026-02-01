# Verifactu Business - Paquete de Branding

## 📦 Assets Generados (Branding Pack Completo)

### Logo Master

- **`logo.png`** (800px width) - Logo fuente de alta resolución generado desde SVG

### Logos Horizontales

- **`logo/logo-horizontal.png`** - Logo completo (uso general)
- **`logo/logo-horizontal-light.png`** - Variante para fondos claros
- **`logo/logo-horizontal-dark.png`** - Variante para fondos oscuros
- **`logo-full.svg`** (200×60px) - SVG vectorial del logo completo

### Iconos de Escudo

- **`icon/icon-shield-128.png`** (128×128px) - Escudo pequeño
- **`icon/icon-shield-256.png`** (256×256px) - Escudo mediano
- **`icon/icon-shield-512.png`** (512×512px) - Escudo grande
- **`shield-icon.svg`** (60×60px) - SVG vectorial del escudo

### Favicons

- **`favicon/favicon-16.png`** (16×16px) - Favicon navegador pequeño
- **`favicon/favicon-32.png`** (32×32px) - Favicon navegador estándar
- **`favicon/favicon-48.png`** (48×48px) - Favicon navegador grande
- **`favicon/favicon.ico`** - Multi-size ICO (16, 32, 48px embebidos)
- **`favicon.svg`** (48×48px) - Favicon SVG para navegadores modernos
- **`favicon/apple-touch-icon.png`** (180×180px) - Para dispositivos Apple

### PWA App Icons

- **`app/icon-192.png`** (192×192px) - PWA icon estándar
- **`app/icon-512.png`** (512×512px) - PWA icon grande
- **`app/app-icon-1024.png`** (1024×1024px) - App Store / Play Store

### Social Media / OpenGraph

- **`social/logo-600.png`** (600×600px) - Logo cuadrado para avatares
- **`social/og-1200x630.png`** (1200×630px) - OpenGraph para compartir en redes
- **`og-image.svg`** (1200×630px) - SVG OpenGraph con diseño completo

### Logo Oficial AEAT

- **`logo-aeat-verifactu.jpg`** - Logo oficial de VeriFactu (Agencia Tributaria)

## 📂 Estructura de Archivos

```
apps/
├── landing/
│   ├── public/
│   │   ├── favicon.svg ✅ (nuevo)
│   │   ├── favicon.ico ✅ (existente)
│   │   └── brand/
│   │       ├── logo-full.svg ✅ (nuevo)
│   │       ├── shield-icon.svg ✅ (nuevo)
│   │       ├── favicon.svg ✅ (nuevo)
│   │       └── og-image.svg ✅ (nuevo)
│   ├── src/components/brand/
│   │   ├── BrandLogo.tsx ✅ (actualizado)
│   │   └── ShieldIcon.tsx ⚠️ (obsoleto - no usado)
│   ├── app/
│   │   ├── layout.tsx ✅ (metadata actualizado)
│   │   └── components/
│   │       └── AuthComponents.tsx ✅ (BrandLogo integrado)
│
└── app/
    ├── public/
    │   └── brand/
    │       ├── logo-full.svg ✅ (copiado)
    │       ├── shield-icon.svg ✅ (copiado)
    │       ├── favicon.svg ✅ (copiado)
    │       └── og-image.svg ✅ (copiado)
    └── layout/
        └── AppSidebar.tsx ✅ (logo actualizado)
```

## 🎨 Especificaciones de Diseño

### Colores

- **Azul Primario**: `#2563eb` (Tailwind blue-600)
- **Azul Oscuro**: `#1e40af` (Tailwind blue-800)
- **Azul Claro**: `#3b82f6` (Tailwind blue-500)
- **Blanco**: `#ffffff`

### Tipografía

- **Font**: `system-ui, -apple-system, sans-serif`
- **"Verifactu"**: Bold 700, tamaño 20px
- **"BUSINESS"**: SemiBold 600, tamaño 8px, uppercase

### Gradiente

```css
linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)
```

## 🔧 Componentes Actualizados

### 1. BrandLogo Component

**Ubicación**: `apps/landing/src/components/brand/BrandLogo.tsx`

**Props**:

- `variant?: "header" | "footer" | "auth"` - Tamaño del logo
- `className?: string` - Clases CSS adicionales

**Uso**:

```tsx
import BrandLogo from "@/components/brand/BrandLogo";

// En Header
<BrandLogo variant="header" />

// En Footer
<BrandLogo variant="footer" />

// En páginas de autenticación
<BrandLogo variant="auth" />
```

### 2. AuthComponents

**Ubicación**: `apps/landing/app/components/AuthComponents.tsx`

Integra `<BrandLogo variant="auth" />` en el layout de autenticación.

### 3. AppSidebar

**Ubicación**: `apps/app/layout/AppSidebar.tsx`

Usa `logo-full.svg` cuando está expandido y `shield-icon.svg` cuando está colapsado.

## 📱 Manifest.json

**Ubicación**: `apps/landing/public/manifest.json`

Actualizado para usar SVG icons en lugar de PNG:

```json
"icons": [
  {
    "src": "/brand/shield-icon.svg",
    "sizes": "any",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  }
]
```

## 🌐 Metadata SEO

**Ubicación**: `apps/landing/app/layout.tsx`

Actualizado con nuevos assets:

```tsx
icons: {
  icon: [
    { url: "/favicon.ico" },
    { url: "/brand/favicon.svg", type: "image/svg+xml" }
  ],
  apple: "/brand/shield-icon.svg"
},
openGraph: {
  images: [{ url: "/brand/og-image.svg", width: 1200, height: 630 }]
},
twitter: {
  images: ["/brand/og-image.svg"]
}
```

## 🗑️ Archivos Eliminados

Los siguientes archivos obsoletos fueron eliminados para evitar confusiones:

- ❌ `apps/landing/public/brand-hero.svg`
- ❌ `apps/landing/public/verifactu.business logo.png`
- ❌ `apps/landing/public/icon-192.png`
- ❌ `apps/landing/public/icon-512.png`
- ❌ `apps/landing/public/brand/nuevo logo.png`
- ❌ `apps/app/public/icono_verifactu.business.png`

## ✅ Páginas Implementadas

### Landing App

- ✅ Navbar (Header.tsx)
- ✅ Footer (page.tsx)
- ✅ Login (app/auth/login/page.tsx)
- ✅ Signup (app/auth/signup/page.tsx)
- ✅ Forgot Password (app/auth/forgot-password/page.tsx)
- ✅ Verify Email (app/auth/verify-email/page.tsx)

### Main App

- ✅ Sidebar (layout/AppSidebar.tsx)

## 🚀 Testing

Para ver los cambios:

```bash
# Landing app
pnpm --filter verifactu-landing dev
# Abre: http://localhost:3001

# Main app
pnpm --filter verifactu-app dev
# Abre: http://localhost:3000
```

## 📝 Notas Adicionales

1. **ShieldIcon.tsx** ya no se usa directamente - reemplazado por `logo-full.svg`
2. **Favicon** se carga desde `/brand/favicon.svg` con fallback a `/favicon.svg`
3. **PWA Icons** usan SVG en lugar de PNG para mejor escalabilidad
4. **Dark mode** no es necesario - el logo funciona en cualquier fondo

## 🎯 Próximos Pasos (Opcional)

Si necesitas PNG icons para compatibilidad con navegadores antiguos:

```bash
npm install sharp
node scripts/generate-icons.js
```

Esto generará `icon-192.png` y `icon-512.png` desde el SVG.
