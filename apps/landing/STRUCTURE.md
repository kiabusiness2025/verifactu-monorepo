# Landing - Estructura & Componentes

## 📁 Estructura de carpetas

```
apps/landing/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Endpoint para chat de Isaak
│   ├── components/
│   │   ├── CookieBanner.tsx      # Banner de cookies (Tailwind + framer-motion)
│   │   ├── IsaakChat.tsx         # Chat flotante de Isaak (componente principal)
│   │   ├── PricingCalculator.tsx # Grid de planes (usado opcionalmente)
│   │   └── Faq.tsx               # FAQ (componente reutilizable)
│   ├── globals.css               # Tailwind directives
│   ├── layout.tsx                # Root layout (importa CookieBanner e IsaakChat)
│   ├── page.tsx                  # Landing page principal (942 líneas)
│   ├── next-auth.d.ts            # Tipos de NextAuth
│   └── tsconfig.json
├── public/
│   └── images/                   # Assets de la landing
├── .gitignore
├── .next/                        # Build output
├── ANIMATIONS.md                 # Especificación de animaciones (referencia)
├── next.config.js                # Next.js config
├── package.json
├── package-lock.json
├── postcss.config.cjs            # PostCSS + Tailwind
├── tailwind.config.cjs           # Tailwind config
└── tsconfig.json
```

## 🎯 Componentes principales

### 1. **CookieBanner.tsx**
- **Ubicación**: `app/components/CookieBanner.tsx`
- **Responsabilidad**: Mostrar banner de cookies al usuario
- **Características**:
  - Animación de entrada con framer-motion
  - LocalStorage para recordar consentimiento
  - Botón "Entendido" y cerrar con X
  - Tailwind CSS (shadow-sm, rounded-2xl, backdrop-blur)
- **Integración**: Auto-incluido en `layout.tsx`

### 2. **IsaakChat.tsx**
- **Ubicación**: `app/components/IsaakChat.tsx`
- **Responsabilidad**: Chat flotante para interactuar con Isaak IA
- **Características**:
  - Botón flotante (fixed bottom-right) con icono MessageCircle
  - Modal chat con header, mensajes, input
  - Llamadas a `/api/chat` para procesar preguntas
  - Animaciones suaves (AnimatePresence, motion.div)
  - Indicador de carga (3 puntos animados)
- **Integración**: Auto-incluido en `layout.tsx`

### 3. **PricingCalculator.tsx**
- **Ubicación**: `app/components/PricingCalculator.tsx`
- **Responsabilidad**: Mostrar grid de planes de precios
- **Características**:
  - 4 planes: Gratis, Profesional, Business, Enterprise
  - Plan destacado con anillo azul ("Más popular")
  - Animación de entrada escalonada (motion.div con `whileInView`)
  - Botones contextuales por plan
- **Integración**: Importar manualmente si se necesita en page.tsx
- **Nota**: La landing actual tiene su propia sección Pricing inline, este componente es reutilizable

### 4. **Faq.tsx**
- **Ubicación**: `app/components/Faq.tsx`
- **Responsabilidad**: Componente acordeón para preguntas frecuentes
- **Características**:
  - Array de Q&A hardcoded
  - Toggle de expansión/colapso
  - Animations suaves
- **Integración**: Importar manualmente si se necesita

## 🎨 Estilos & Configuración

### Tailwind CSS
- **Config**: `tailwind.config.cjs` → targets `app/**` y `components/**`
- **PostCSS**: `postcss.config.cjs` → plugins: tailwindcss, autoprefixer
- **Globals**: `app/globals.css` → directives (@tailwind base/components/utilities)

### Clases principales usadas
- Sombras: `shadow-sm`, `shadow-md`, `shadow-lg`
- Bordes: `ring-1 ring-slate-200`, `border border-slate-200`
- Espaciado: `px-4`, `py-3`, `gap-2`, `gap-4`, `gap-6`
- Colores: `text-slate-600`, `bg-blue-600`, `text-emerald-600`
- Efectos: `backdrop-blur`, `hover:bg-slate-50`, `transition`

### Animaciones (framer-motion)
- **Entrada**: `initial={{ opacity: 0 }}` + `animate={{ opacity: 1 }}`
- **Salida**: `exit={{ opacity: 0 }}`
- **Hover**: `whileHover={{ scale: 1.05 }}`
- **Tap**: `whileTap={{ scale: 0.95 }}`
- **InView**: `whileInView={{ opacity: 1 }}` (detecta visibilidad)

## 📄 Page.tsx (Landing principal)

**Ubicación**: `app/page.tsx` (942 líneas)

### Secciones:
1. **Hero** - Titular + subtítulo + CTAs + mockup de Isaak
2. **Stats bar** - 3 KPIs
3. **Features** - 4 tarjetas (Emisión, Gastos, Dashboard, Bajo demanda)
4. **Pídeselo a Isaak** - 6 ejemplos de comandos
5. **3 Steps** - Flujo de 3 pasos
6. **Dashboard** - Mockup del panel principal
7. **Compliance** - Sección VeriFactu
8. **Pricing** - 4 planes de precios
9. **Resources** - 3 recursos/guías
10. **Final CTA** - Llamada a acción final
11. **Footer** - Pie de página

### Estado (useState)
- `msgIndex` - Índice del mensaje visible en el mockup
- `pricingModel` - Modelo de precios seleccionado (fija/porcentaje/híbrido)
- `benefitTarget` - Contador animado de beneficio (0 → 12.450)

### Hooks
- `useEffect` - Rotación de mensajes (5.2s), contador de beneficio animado
- `useMemo` - Cálculo de mensajes visibles, lista de isaakMessages

## 🚀 Build & Deploy

### Build local
```bash
cd apps/landing
npm run build
npm run dev  # Puerto 3000
```

### Validación
- Size: 47.4 kB (route) | 134 kB (First Load JS)
- No errors en TypeScript
- Componentes compilados correctamente

## 📝 Notas de desarrollo

- **API Chat**: Integrado en `/api/chat/route.ts` (backend)
- **Componentes reutilizables**: CookieBanner, IsaakChat, PricingCalculator, Faq
- **Sin tecnicismos**: Copy limpio, enfoque "sin miedo" para usuarios no técnicos
- **Responsive**: Grid adaptativo (sm/md/lg breakpoints)
- **Accessibility**: aria-labels, keyboard navigation, semantic HTML

## 🔄 Próximas mejoras

1. [ ] Integrar PricingCalculator en página principal (opcional)
2. [ ] Añadir FAQ section en landing
3. [ ] Conectar IsaakChat con backend real
4. [ ] Implementar selector de modelo de precios (fija/porcentaje/híbrido)
5. [ ] A/B testing de headlines
6. [ ] Analytics (si se necesita)
7. [ ] Testimonios de usuarios
