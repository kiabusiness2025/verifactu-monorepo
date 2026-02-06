# QUICK REFERENCE - COMPONENT USAGE

**Last Updated:** January 10, 2026  
**For:** Rapid implementation of Button & OptimizedImage components

---

## 🔘 BUTTON COMPONENT

### Import

```tsx
import { Button } from '@/components/ui';
```

### Basic Usage

```tsx
<Button>Click me</Button>
```

### Variants

```tsx
<Button variant="primary">Primary (default)</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
```

### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

### With Icon

```tsx
import { ChevronRight } from 'lucide-react';

<Button variant="primary" icon={<ChevronRight size={20} />}>
  Next step
</Button>;
```

### Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

<Button isLoading={isLoading} disabled={isLoading} onClick={handleSubmit}>
  {isLoading ? 'Guardando...' : 'Guardar'}
</Button>;
```

### Full Width

```tsx
<Button fullWidth variant="primary">
  Take full width
</Button>
```

### Complete Example (Hero CTA)

```tsx
<Button
  variant="primary"
  size="lg"
  fullWidth
  onClick={() => router.push('/dashboard')}
  aria-label="Start free trial"
>
  Empezar gratis
</Button>
```

---

## 🖼️ OPTIMIZED IMAGE COMPONENT

### Import

```tsx
import { OptimizedImage } from '@/components/ui';
```

### Basic Usage

```tsx
<OptimizedImage src="/images/hero.jpg" alt="Dashboard preview" width={1200} height={630} />
```

### Hero Image (Priority Loading)

```tsx
<OptimizedImage
  src="/images/hero.jpg"
  alt="Verifactu dashboard showing sales and expenses"
  width={1920}
  height={1080}
  priority={true} // ← ONLY for above-fold images
  sizes="100vw"
/>
```

### Feature Grid (50% width on desktop)

```tsx
<OptimizedImage
  src="/images/feature.jpg"
  alt="Feature description"
  width={600}
  height={400}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Logo (Contain, not Cover)

```tsx
<OptimizedImage
  src="/brand/logo.svg"
  alt="Verifactu logo"
  width={200}
  height={50}
  objectFit="contain"
  quality={90}
/>
```

### With Quality Adjustment

```tsx
<OptimizedImage
  src="/images/photo.jpg"
  alt="Team photo"
  width={800}
  height={600}
  quality={60} // Lower quality = smaller file
/>
```

### Complete Example (Feature Card)

```tsx
<div className="rounded-lg overflow-hidden aspect-video">
  <OptimizedImage
    src="/images/feature-banner.jpg"
    alt="Automated invoice processing feature demo"
    width={400}
    height={300}
    sizes="(max-width: 768px) 100vw, 33vw"
    objectFit="cover"
    objectPosition="center"
  />
</div>
```

---

## 🔗 LINKS BEST PRACTICES

### Internal Link (Use Link Component)

```tsx
import Link from 'next/link';

<Link href="/pricing">View pricing plans</Link>;
```

### External Link (Security + Accessibility)

```tsx
<a
  href="https://example.com"
  rel="noopener noreferrer"
  target="_blank"
  aria-label="Visit Example website (opens in new tab)"
>
  Visit Example
</a>
```

### Icon-Only Link

```tsx
<a
  href="https://twitter.com/verifactu"
  rel="noopener noreferrer"
  target="_blank"
  aria-label="Follow us on Twitter"
>
  <TwitterIcon size={24} aria-hidden="true" />
</a>
```

### Anchor/Hash Link

```tsx
// Link to section
<a href="#features">Jump to features</a>

// Target section
<section id="features">
  <h2>Features</h2>
</section>

// Cross-page anchor
<Link href="/guide#section-2">
  See example in guide
</Link>
```

---

## 🎨 COMMON PATTERNS

### Hero Section

```tsx
<section className="relative w-full h-screen">
  <OptimizedImage
    src="/images/hero.jpg"
    alt="Verifactu dashboard interface"
    width={1920}
    height={1080}
    priority
    sizes="100vw"
    objectFit="cover"
  />
  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-white mb-4">Gestiona tus ventas con tranquilidad</h1>
      <Button variant="primary" size="lg">
        Empezar gratis
      </Button>
    </div>
  </div>
</section>
```

### Feature Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {features.map((feature) => (
    <div key={feature.id} className="rounded-lg overflow-hidden">
      <OptimizedImage
        src={feature.image}
        alt={feature.title}
        width={400}
        height={300}
        sizes="(max-width: 768px) 100vw, 33vw"
        objectFit="cover"
      />
      <div className="p-4">
        <h3 className="font-semibold mb-2">{feature.title}</h3>
        <p className="text-gray-600 mb-4">{feature.description}</p>
        <Button variant="ghost" size="sm">
          Learn more
        </Button>
      </div>
    </div>
  ))}
</div>
```

### Pricing Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {plans.map((plan) => (
    <div key={plan.id} className="border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">{plan.name}</h3>
      <p className="text-3xl font-bold mb-6">{plan.price}</p>
      <ul className="space-y-3 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start">
            <CheckIcon size={20} className="text-green-600 mr-3 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button variant={plan.isPopular ? 'primary' : 'secondary'} fullWidth>
        Seleccionar
      </Button>
    </div>
  ))}
</div>
```

### Navigation

```tsx
<nav className="flex gap-6">
  <Link href="/">Home</Link>
  <Link href="/features">Features</Link>
  <Link href="/pricing">Pricing</Link>
  <a href="https://docs.example.com" rel="noopener noreferrer" target="_blank">
    Docs
  </a>
  <Button variant="primary" size="sm">
    Entrar
  </Button>
</nav>
```

---

## ⚙️ TAILWIND CLASSES REFERENCE

### Button Styling (Manual - for reference only)

```css
/* Primary Button */
.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800
         focus:ring-2 focus:ring-indigo-500 focus:outline-none
         px-4 py-2 rounded-lg font-medium transition-all;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400
         focus:ring-2 focus:ring-gray-500 focus:outline-none
         px-4 py-2 rounded-lg font-medium transition-all;
}

/* Ghost Button */
.btn-ghost {
  @apply bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900
         focus:ring-2 focus:ring-gray-500 focus:outline-none
         px-4 py-2 rounded-lg font-medium transition-all;
}
```

**Note:** Use the Button component instead - no need to write these manually.

---

## 🧪 TESTING CHECKLIST

### Button Component

- [ ] Click works on all variants
- [ ] Keyboard (Enter, Space) activates button
- [ ] Focus visible on all buttons
- [ ] Loading spinner appears
- [ ] Disabled state looks correct
- [ ] All 5 variants render correctly
- [ ] All 4 sizes render correctly
- [ ] Mobile touch works (44x44px)

### OptimizedImage Component

- [ ] Image loads and displays
- [ ] Image is responsive (resize window)
- [ ] Lazy loads below fold (use DevTools)
- [ ] No layout shift (test with DevTools)
- [ ] Quality setting affects file size
- [ ] Alt text is visible (inspect element)
- [ ] Mobile displays correctly
- [ ] Performance improves (check Lighthouse)

### Links

- [ ] Internal links navigate correctly
- [ ] External links open in new tab
- [ ] Keyboard navigation works
- [ ] Focus visible on all links
- [ ] Icon-only links announced correctly (screen reader)

---

## 🔍 DEBUGGING TIPS

### Button not appearing

- Check import: `import { Button } from '@/components/ui'`
- Check className is not being overridden
- Check variant/size are valid values

### Image not showing

- Check `src` path starts with `/` (relative to public/)
- Check `alt` is not empty
- Check width/height are correct
- Check file exists in public/ folder

### Image stretched/distorted

- Verify width/height aspect ratio matches image
- Check `objectFit` setting (cover vs contain)
- Adjust with `sizes` attribute

### Performance not improving

- Make sure to use `priority={true}` ONLY on above-fold images
- Check DevTools to verify images are responsive
- Verify WebP format is being used
- Check image file size is reasonable

---

## 📱 RESPONSIVE SIZES REFERENCE

```tsx
// Full width (hero, banner)
sizes = '100vw';

// Two columns (50% on desktop)
sizes = '(max-width: 768px) 100vw, 50vw';

// Three columns (33% on desktop)
sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';

// Custom container (fits 1200px container)
sizes = '(max-width: 768px) 100vw, 1200px';

// Sidebar + content
sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 700px';
```

---

## 🎯 PRIORITY CHECKLIST

### Implement First (Order)

1. [ ] Button component in page.tsx (hero)
2. [ ] Button component in Features.tsx
3. [ ] Button component in Pricing
4. [ ] Button component in Footer
5. [ ] OptimizedImage in hero section
6. [ ] OptimizedImage in feature cards
7. [ ] Fix accessibility (contrast, focus, heading)
8. [ ] Audit links (internal/external, rel attributes)

### Expected After Each Step

1. After buttons: Code cleaner, more consistent styling
2. After images: Lighthouse Performance +5-15 points
3. After accessibility: Lighthouse Accessibility 95+
4. After links: Better SEO, security hardened

---

**Use this guide for rapid reference during implementation.**

For detailed information, see the main documentation files:

- BUTTON_COMPONENT_GUIDE.md
- IMAGE_OPTIMIZATION_GUIDE.md
- ACCESSIBILITY_AUDIT.md
- LINKS_AUDIT.md
