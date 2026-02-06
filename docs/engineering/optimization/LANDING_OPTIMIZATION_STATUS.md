# OPTIMIZACIONES LANDING PAGE - ESTADO ACTUAL

**Fecha:** Enero 10, 2026  
**Proyecto:** Verifactu.business - Landing Page  
**Objetivo:** Performance, Captación, SEO, Velocidad - PERFECTO

---

## ✅ IMPLEMENTADO (10 Ene 2026)

### 1. **FAQ Accordion (CRITICAL)**

- ✅ Convertido a componente interactivo
- ✅ Single expand (solo 1 item abierto a la vez)
- ✅ localStorage persistence ("faq-expanded")
- ✅ Animaciones suave con Framer Motion
- ✅ Accessibility: aria-expanded, aria-controls
- ✅ Schema.org FAQPage para SEO
- ✅ Responsive design mejorado
- **Impacto:** +UX mejor, +engagement FAQ, +SEO structured data

### 2. **Header Navigation (IMPORTANTE)**

- ✅ Cambio <a> → <Link> (Next.js optimization)
- ✅ Removed version display (was "v1.0.3")
- ✅ Accessibility improvements:
  - aria-label en botones
  - aria-expanded en mobile menu
  - aria-controls="mobile-menu"
- ✅ Mobile menu properly controlled
- **Impacto:** +Performance (Link prefetch), +A11y, -Clutter

### 3. **Sitemap Dinámico (SEO)**

- ✅ Creado sitemap.ts con 16 rutas
- ✅ Priorities optimizadas (0.3-1.0)
- ✅ Change frequencies (daily, weekly, monthly)
- ✅ Integración con Google Search Console
- **Impacto:** +Crawlability, +Indexation, +SEO

### 4. **Next.config Mejorado (PERFORMANCE)**

- ✅ Image optimization settings
  - Formatos avif, webp
  - Cache 1 año
- ✅ Security headers
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: denegadas cámara/micrófono/geolocalización
- ✅ Cache headers para assets estáticos
  - /static/\* → 1 año (immutable)
  - /images/\* → 1 año (immutable)
- ✅ DNS Prefetch ON (faster external requests)
- **Impacto:** +Security, +Performance, +Cache efficiency

### 5. **Encoding & Build (TECHNICAL)**

- ✅ UTF-8 encoding fixes en 5 archivos
- ✅ Middleware para /es/\* redirects (301 permanent)
- ✅ Firebase telemetry lazy-loaded (build safe)
- ✅ Webpack externals configured

### 6. **Pricing Calculator (FEATURE)**

- ✅ Updated con lógica exacta del usuario:
  - Base: 19€
  - Companies: +7€/company
  - Facturas: tiers 51-200, 201-500, 501-1000, 1001-2000
  - Movimientos: tiers 1-200, 201-800, 801-2000, 2001-5000
- ✅ If/else chain for clarity (vs object lookup)

### 7. **Layout Meta Tags (SEO)**

- ✅ OpenGraph completo
- ✅ Twitter Card (summary_large_image)
- ✅ Favicon en 4 tamaños
- ✅ PWA manifest
- ✅ Preconnect a Firebase, Stripe
- ✅ Theme color configurado

---

## ⏳ NEXT PRIORITY (Por orden de impacto)

### CRITICAL - Implementar ahora

#### 1. **Button Component Standardization**

```typescript
// Crear: apps/landing/app/components/ui/Button.tsx

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-ring',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  ghost: 'bg-transparent text-gray-600 hover:text-gray-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};
```

**Localizaciones donde aplicar:**

1. Hero CTA ("Empezar gratis")
2. Pricing modal triggers
3. Feature section CTAs
4. Footer links
5. FAQ expand/collapse
6. Header navigation

**Beneficios:**

- Consistency UI/UX
- Easier maintenance
- Accessibility builtin (disabled states, aria-labels)
- Performance (reusable component)

---

#### 2. **Image Optimization with Next Image**

```typescript
// Buscar todos los <img> y convertir a:
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  alt="Descriptive text for SEO + A11y"
  width={1200}
  height={630}
  priority={isAboveFold}
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={75}
/>
```

**Impacto en Performance:**

- Automatic format conversion (webp/avif)
- Lazy loading below fold
- Responsive srcSet
- Blur placeholder option
- Size hints to prevent CLS

**Archivos a revisar:**

1. apps/landing/app/page.tsx (hero image)
2. apps/landing/app/components/Features.tsx
3. apps/landing/app/components/HowItWorks.tsx
4. apps/landing/app/components/Testimonials.tsx (if any)
5. Blog posts in /recursos

---

#### 3. **Full Accessibility Audit & Fix**

**Checklist:**

- [ ] Color contrast: WCAG AAA (7:1) or at least AA (4.5:1)
- [ ] Keyboard navigation: Can Tab through entire page
- [ ] Focus visible: Clear focus indicators on all interactive elements
- [ ] ARIA: Complete aria-labels, aria-describedby on form fields
- [ ] Headings: H1, H2, H3... proper hierarchy
- [ ] Images: alt text on ALL images (descriptive, not "image" or "photo")
- [ ] Forms: Labels properly associated (<label htmlFor>)
- [ ] Links: All links have descriptive text (not "click here")
- [ ] Skip links: "Skip to main content" link at top
- [ ] Mobile: Touch targets minimum 44x44px

**Tools:**

```bash
# Install accessibility checker
pnpm add -D axe-core @axe-core/react

# Test colors
# https://webaim.org/resources/contrastchecker/
```

---

#### 4. **Links Audit & Fixes**

**Checklist:**

- [ ] All internal links use `<Link>` from Next.js (not `<a href>`)
- [ ] External links have `rel="noopener noreferrer"`
- [ ] Dead links fixed or removed
- [ ] Anchor links (#) working correctly
- [ ] Icon-only links have aria-label or title
- [ ] All links have descriptive text (for SEO + A11y)
- [ ] No "click here" or "read more" without context

**Patterns:**

```typescript
// ❌ Wrong
<a href="https://external.com">Click here</a>

// ✅ Correct
<a href="https://external.com" rel="noopener noreferrer" aria-label="External link: Company website">
  Visit our partner website
</a>
```

---

### IMPORTANT - Implementar después de Critical

#### 5. **Content & Copy Optimization**

- [ ] Remove jargon: Replace tech terms with clear Spanish
- [ ] Simplify sentences: Avg 15-20 words per sentence
- [ ] CLR (Cost Lettres Reading): Check reading complexity
- [ ] Trust elements: Social proof, testimonials, badges
- [ ] Value prop clarity: Why choose Verifactu in first 2 seconds?
- [ ] Urgency: Limited offer, deadline, exclusivity?
- [ ] Benefit-focused: Not features, but outcomes

**Example improvements:**

```
❌ "Automatización de flujos SOAP con VeriFactu XML"
✅ "Tus facturas revisadas automáticamente - cero errores"

❌ "Conformidad normativa con regulaciones fiscales"
✅ "Cumple VeriFactu - tranquilo con Hacienda"
```

---

#### 6. **Performance & Metrics**

**Target Lighthouse Scores:**

- Performance: > 90
- SEO: > 95
- Accessibility: > 95
- Best Practices: > 90

**Optimizations:**

```typescript
// 1. Code splitting by route
import dynamic from 'next/dynamic';
const PricingModal = dynamic(() => import('./PricingModal'), {
  loading: () => <div>Loading...</div>,
});

// 2. Lazy load components
import { Suspense } from 'react';
<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>

// 3. Cache strategy
// Already configured in next.config.js

// 4. Remove DevStatusBanner from production
// ✅ Already done in layout.tsx: process.env.NODE_ENV !== "production"
```

**Análisis de bundle:**

```bash
pnpm add -D @next/bundle-analyzer
# Update next.config.js with analyzer
pnpm build  # See bundle size breakdown
```

---

#### 7. **Social Proof & Conversion**

- [ ] Add testimonials section (3-5 short quotes)
- [ ] Trust badges (secure payment, GDPR, etc)
- [ ] Security indicators: SSL, auth, data protection
- [ ] Case studies/success metrics
- [ ] Newsletter signup (high-intent lead)
- [ ] Urgency triggers: "Join X companies already using..."
- [ ] FAQ linked from CTA (reduce friction)
- [ ] Money-back guarantee or trial

---

#### 8. **Mobile UX Perfection**

**Checklist:**

- [ ] Touch targets: 44x44px minimum
- [ ] Font sizes: 16px minimum on inputs (prevents iOS zoom)
- [ ] Viewport meta: Correct initial-scale and max-scale
- [ ] Mobile menu: Smooth animation, closes on nav click
- [ ] Forms: Mobile-optimized inputs (tel, email, number)
- [ ] Images: Responsive (srcSet, sizes)
- [ ] Horizontal scroll: None (unless intentional)
- [ ] Performance: < 3s load time on 4G

---

## 📊 AUDIT CHECKLIST COMPLETO (95+ items)

### SEO (25 items)

- [x] Sitemap.xml generated and submitted
- [x] robots.txt configured
- [x] Meta titles optimized (50-60 chars)
- [x] Meta descriptions (150-160 chars)
- [ ] Heading hierarchy (H1, H2, H3...)
- [ ] Schema.org structured data (Organization, LocalBusiness)
- [ ] OpenGraph images (1200x630)
- [ ] Twitter Card (summary_large_image)
- [ ] Internal linking strategy
- [ ] Keyword research & placement
- [ ] Blog post optimization
- [ ] Alt text on all images
- [ ] URL structure clarity
- [ ] Canonical tags
- [ ] Mobile-first indexing ready
- [ ] Core Web Vitals optimized
- [ ] Page speed > 90 Lighthouse
- [ ] Breadcrumbs (if applicable)
- [ ] FAQ Schema (✅ implemented)
- [ ] Language hreflang tags
- [ ] Sitemap in GSC submitted
- [ ] 404 page branded
- [ ] Robots.txt in GSC
- [ ] Index coverage issues checked
- [ ] Search appearance checked

### PERFORMANCE (20 items)

- [x] Image optimization configured
- [x] Cache headers configured
- [x] DNS prefetch enabled
- [ ] Critical CSS inlined
- [ ] Unused CSS removed
- [ ] JavaScript code splitting
- [ ] Lazy loading implemented
- [ ] CDN/Vercel edge optimized
- [ ] Database queries optimized
- [ ] API response times < 200ms
- [ ] First Contentful Paint < 1.8s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms
- [ ] Bundle size < 500KB
- [ ] Font loading optimized
- [ ] Video lazy loading
- [ ] Third-party script async/defer
- [ ] Service worker (PWA)
- [ ] Performance budget enforcement

### ACCESSIBILITY (25 items)

- [x] aria-labels on buttons
- [x] aria-expanded on toggles
- [x] Focus visible on all elements
- [ ] Keyboard navigation complete
- [ ] Color contrast WCAG AA (4.5:1)
- [ ] Color contrast WCAG AAA (7:1) where critical
- [ ] Screen reader testing (NVDA/JAWS)
- [ ] Heading hierarchy H1-H6
- [ ] Form labels associated
- [ ] Form validation messages
- [ ] Skip link for main content
- [ ] Alt text descriptive (not "image")
- [ ] Icon buttons have aria-label
- [ ] Disabled state accessible
- [ ] Error messages clear
- [ ] Success messages announced
- [ ] Links descriptive (not "click here")
- [ ] Tab order logical
- [ ] Mobile: Touch targets 44x44px
- [ ] Touch: Spacing between targets
- [ ] ARIA landmarks (nav, main, footer)
- [ ] ARIA live regions for updates
- [ ] Video captions (if any)
- [ ] Audio transcripts (if any)
- [ ] Reduced motion support

### CONVERSION & CTA (15 items)

- [ ] Primary CTA visible above fold
- [ ] CTA copy compelling & action-oriented
- [ ] CTA contrasts with background
- [ ] Multiple CTAs throughout page
- [ ] Pricing transparent and clear
- [ ] Trust elements visible
- [ ] Social proof (testimonials, metrics)
- [ ] Form fields minimal (< 5 fields)
- [ ] Form validation real-time
- [ ] Clear value proposition
- [ ] Objection handling (FAQs, guarantees)
- [ ] Mobile CTA touch-friendly
- [ ] Button size adequate (16px+ font)
- [ ] Copy benefit-focused
- [ ] Load time < 3s (mobile 4G)

---

## 🎯 IMPLEMENTACIÓN ROADMAP

### Semana 1 (CRITICAL - do first)

1. **Button Component** → Standardize all buttons
2. **Image Optimization** → Next Image on all images
3. **Accessibility Audit** → Fix contrast, keyboard nav, ARIA

### Semana 2 (IMPORTANT)

4. **Links Audit** → Fix broken links, add rel attributes
5. **Content Optimization** → Simplify copy, add social proof
6. **Performance Tuning** → Bundle analysis, code splitting

### Semana 3 (POLISH)

7. **Mobile UX** → Touch targets, forms, responsiveness
8. **Conversion** → Add testimonials, trust badges, CTA optimization
9. **SEO Final** → Schema markup, canonicals, hreflang

---

## 🚀 QUICK WINS (Can do today)

1. **Remove DevStatusBanner from production** → Already done ✅
2. **Update robots.txt** → Better crawl directives
3. **Add preload for hero image** → Faster LCP
4. **Review footer links** → External links need rel
5. **Check heading hierarchy** → Ensure H1, H2, H3...

---

## 📝 NOTES FOR USER

- All changes maintain backwards compatibility
- No breaking changes to existing functionality
- All code follows Next.js 14 best practices
- Performance optimizations are cumulative (each builds on previous)
- Timeline estimate: 2-3 weeks for full implementation
- Test on real mobile devices, not just browser emulation
- Use Lighthouse CI for continuous monitoring

---

**Status:** Ready to implement CRITICAL tasks  
**Last Updated:** 2026-01-10  
**Owner:** Isaak (Technical Lead)
