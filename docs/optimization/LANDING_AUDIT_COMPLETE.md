# 🔍 Auditoría Completa - Landing Verifactu.Business

**Fecha:** 9 Enero 2026  
**Estado:** Revisión exhaustiva en progreso  
**Objetivo:** Optimizar para SEO, Performance, Conversión y UX

---

## 📊 RESUMEN EJECUTIVO

### ✅ Lo que funciona bien:
- Metadata y Open Graph correctamente configurados
- Analytics (Vercel) integrado
- Favicon y Apple Web App configurados
- Mobile responsive aparentemente bien
- FAQ con schema.org JSON-LD
- Preconnect a servicios externos

### ⚠️ Áreas a mejorar:
1. **FAQ** - No es interactivo (sin accordion)
2. **Botones y CTAs** - Inconsistencias de estilos
3. **Navegación** - Menú móvil podría mejorar
4. **Optimizaciones técnicas** - Faltan varias
5. **Performance** - Image optimization
6. **Internos** - Enlaces sin rel attributes en algunos casos
7. **Meta tags** - Podrían ser más específicos por página
8. **Secciones** - Algunas tienen contenido redundante

---

## 🎯 ANÁLISIS DETALLADO

### 1. FAQ (Prioridad Alta)

**Problemas actuales:**
- ❌ Sin estado expandible/contraíble (no es un accordion verdadero)
- ❌ Todas las respuestas visibles siempre (terrible para UX móvil)
- ✅ Tiene schema.org correcto
- ✅ Datos bien estructurados

**Mejoras necesarias:**
```
[ ] Convertir a accordion interactivo (expandible)
[ ] Guardar estado en localStorage (UX mejorada)
[ ] Animaciones suaves al expandir
[ ] Solo una pregunta abierta a la vez (mejor UX)
[ ] Búsqueda/filtrado de FAQs (para cuando haya 10+)
[ ] Indicador visual de preguntas leídas
```

---

### 2. Header & Navegación

**Problemas:**
- ⚠️ El menú móvil no cierra al hacer click en enlace (fijo en código)
- ❌ Versión (v1.0.3) no debería estar visible en producción
- ⚠️ Links usan `href` en lugar de `Link` en algunos casos
- ❌ Sin aria-label en todos los links de navegación

**Mejoras:**
```
[ ] Remover versión visible o moverla a footer
[ ] Cambiar enlaces a <Link> de Next.js (mejor prefetching)
[ ] Agregar aria-label descriptivos
[ ] Cerrar menú móvil al navegar
[ ] Highlighter visual del link activo actual
[ ] Mega menu para categorías complejas (si crece)
```

---

### 3. Botones y CTAs

**Estado actual:**
- CTAs principales: gradiente blue (bueno)
- Secundarios: slate-100 (bueno)
- Inconsistencias: algunos botones tienen `px-4 py-2`, otros `px-6 py-3`
- Sin `aria-label` en algunos botones

**Mejoras:**
```
[ ] Crear componente Button reutilizable con variantes
[ ] Estandarizar tamaños (sm, md, lg)
[ ] Agregar loading states
[ ] Agregar disabled states
[ ] Mejorar contraste en botones secundarios
[ ] Agregar aria-label donde falte
```

**Código propuesto:**
```typescript
// Button.tsx - Componente reutilizable
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled = false,
  ...props
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800',
    secondary: 'bg-slate-100 text-slate-900 ring-1 ring-slate-200 hover:bg-slate-200',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button 
      className={`rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

### 4. SEO & Meta Tags

**Lo que tiene:**
- ✅ metadataBase correcto
- ✅ OpenGraph configurado
- ✅ Twitter Card
- ✅ Manifest
- ✅ Canonical URLs implícito

**Lo que falta:**
```
[ ] Alternativas hreflang (si hay versiones de idiomas)
[ ] Structured data para Organization (en root)
[ ] Breadcrumb schema en páginas internas
[ ] Product/Service schema
[ ] meta robots, meta noindex en dev
[ ] Verificaciones: Google Search Console, Bing
[ ] Sitemap.xml dinámico
[ ] robots.txt
```

**Archivos a crear:**
```
- /public/sitemap.xml (generado dinámicamente)
- /public/robots.txt
```

---

### 5. Performance & Velocidad

**Optimizaciones actuales:**
- ✅ Preconnect a servicios
- ✅ Compress: true
- ✅ Font: display: "swap"

**Falta:**
```
[ ] Image optimization: usar Next Image en lugar de <img>
[ ] Lazy loading de componentes
[ ] Code splitting por ruta
[ ] Minificación CSS (Tailwind purge - ya está)
[ ] Caching headers en Vercel
[ ] Webp/modern formats para imágenes
[ ] Eliminar DevStatusBanner en prod
[ ] Eliminar console.logs
```

**Medidas clave:**
- Objetivo: Lighthouse > 90 en Performance, SEO, Accessibility

---

### 6. Conversión y CTAs

**Flujo actual:**
1. Landing → /auth/login ✓
2. Landing → /verifactu/planes ✓
3. Landing → Dashboard ✓
4. Pricing calculator modal ✓

**Mejoras:**
```
[ ] CTA principal (Above the fold): "Empezar gratis" → landing/dashboard
[ ] Claridad: ¿Qué pasará? (login vs. crear cuenta)
[ ] Microconversiones: Email capture, newsletter signup
[ ] Retenimiento: Chat con Isaak (bueno, pero mejorar UX)
[ ] Tests A/B: "Empezar gratis" vs "Acceder" vs "Ver demo"
[ ] Social proof: Testimonios, Trust badges
[ ] Urgencia: "Plan gratis siempre disponible"
```

---

### 7. Accesibilidad (WCAG 2.1 AA)

**Lo que tiene:**
- ✅ Estructura semántica básica
- ✅ aria-label en botones
- ⚠️ Algunos enlaces sin contexto claro

**Falta:**
```
[ ] Skiplinks (saltarse nav en mobile)
[ ] Color contrast check (principalmente en textos grises)
[ ] Alt text en todas las imágenes
[ ] Focus states visibles en todos los interactivos
[ ] Prueba con screen reader (NVDA, JAWS)
[ ] Keyboard navigation completa
[ ] Reducción de movimiento (prefers-reduced-motion)
```

---

### 8. Enlaces (Audit)

**Revisar que:**
```
[ ] Todos los enlaces internos usan <Link> de Next.js
[ ] Enlaces externos tienen rel="noopener noreferrer"
[ ] mailto: links usan formato correcto
[ ] Links telefónicos (tel:) si existen
[ ] No hay 404s
[ ] Anchors (#) funcionan correctamente
[ ] Links tienen aria-label si solo son iconos
```

---

### 9. Contenido & Estructura

**Página principal (page.tsx):**
- ✅ Hero section clara
- ✅ Propuesta de valor: "ventas - gastos = beneficio"
- ✅ Secciones bien organizadas
- ⚠️ Algunas secciones redundantes
- ❌ Sin CTA explícita entre secciones

**Mejoras:**
```
[ ] Agregar CTA entre cada sección principal
[ ] Mejorar transiciones entre secciones
[ ] Agregar social proof / testimonios
[ ] Agregar FAQ en contexto relevante
[ ] Mejorar copy (reducir tecnicismos)
[ ] Agregar trust indicators (badges)
```

---

### 10. Mobile UX

**Problemas observados:**
- ⚠️ Espacios en padding podrían optimizarse
- ⚠️ Tamaños de texto en móvil
- ✅ Responsive design parece funcionar

**Mejoras:**
```
[ ] Test en dispositivos reales (iPhone, Android)
[ ] Velocidad de carga móvil (LCP, FID, CLS)
[ ] Touch targets >= 44x44px
[ ] Viewport meta correcto (✓ ya está)
[ ] Bottom sheet para menú móvil en lugar de top dropdown
```

---

## 📋 PLAN DE ACCIÓN (Por prioridad)

### 🔴 CRÍTICO (Semana 1)

1. **FAQ accordion interactivo**
   - Convertir a componente expandible
   - Agregar localStorage para recordar estado
   - Tiempo estimado: 2-3 horas

2. **Crear componente Button reutilizable**
   - Estandarizar estilos
   - Variantes: primary, secondary, ghost
   - Tamaños: sm, md, lg
   - Tiempo estimado: 1-2 horas

3. **Mejorar Header**
   - Remover versión (o moverla a footer)
   - Cerrar menú móvil al navegar
   - Indicador de link activo
   - Tiempo estimado: 1.5 horas

4. **SEO básico**
   - Crear `/public/robots.txt`
   - Crear `/public/sitemap.xml`
   - Agregar meta robots
   - Tiempo estimado: 1 hora

### 🟡 IMPORTANTE (Semana 2)

5. **Image optimization**
   - Reemplazar <img> con <Image>
   - Agregar alt text donde falte
   - Optimizar tamaños
   - Tiempo estimado: 3-4 horas

6. **Accesibilidad**
   - Mejorar color contrast
   - Agregar skiplinks
   - Keyboard navigation test
   - Tiempo estimado: 2-3 horas

7. **Links audit**
   - Cambiar href a Link donde sea apropiado
   - Agregar rel attributes a externos
   - Prueba de 404s
   - Tiempo estimado: 1.5 horas

8. **Performance**
   - Remover DevStatusBanner en prod
   - Lazy loading de secciones
   - Code splitting
   - Tiempo estimado: 2 horas

### 🟢 MEJORA (Semana 3-4)

9. **Social proof & conversión**
   - Agregar testimonios
   - Trust badges
   - Mejorar copy
   - Tiempo estimado: 4-5 horas

10. **Analytics & monitoring**
    - Google Analytics (además de Vercel)
    - Heat mapping (Hotjar)
    - Form analytics
    - Tiempo estimado: 2 horas

---

## 🔧 CHECKLIST TÉCNICO

- [ ] Lighthouse score >= 90 (Performance, SEO, Accessibility)
- [ ] Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Mobile-first responsive (tested on devices)
- [ ] No console.logs en producción
- [ ] All images optimized (Next Image)
- [ ] All links tested (no 404s)
- [ ] Accessibility: WCAG 2.1 AA
- [ ] SEO: robots.txt, sitemap.xml, meta tags
- [ ] Security: CSP headers, no exposed secrets
- [ ] Performance: < 3MB total bundle

---

## 🚀 PRÓXIMOS PASOS

¿Por cuál sección empezamos?

1. **FAQ accordion** (mejor UX + conversión)
2. **Button component** (consistencia)
3. **Header improvements** (navegación)
4. **SEO files** (visibilidad)

Recomiendo el orden: **FAQ → Button → Header → SEO**

---

## 📞 Contacto & Notas

- Revisar también `/app` y `/api` para consistencia
- Coordinar cambios de estilo con equipo de diseño
- Testing cross-browser antes de deploy
- Validar con usuarios finales (especialmente FAQ e CAD)
