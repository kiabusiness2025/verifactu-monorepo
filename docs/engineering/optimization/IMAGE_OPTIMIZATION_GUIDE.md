# IMAGE OPTIMIZATION IMPLEMENTATION GUIDE

**Component:** apps/landing/app/components/ui/OptimizedImage.tsx  
**Status:** ✅ Created and ready to use  
**Date:** 2026-01-10

---

## Quick Start

```typescript
import { OptimizedImage } from '@/components/ui';

// Basic usage - images will be automatically optimized
<OptimizedImage
  src="/images/hero.jpg"
  alt="Verifactu dashboard overview"
  width={1200}
  height={630}
/>

// Priority loading (for hero image)
<OptimizedImage
  src="/images/hero.jpg"
  alt="Verifactu dashboard overview"
  width={1200}
  height={630}
  priority
/>

// Custom sizes for responsive design
<OptimizedImage
  src="/images/feature.jpg"
  alt="Feature description"
  width={1200}
  height={400}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// With blur placeholder
<OptimizedImage
  src="/images/feature.jpg"
  alt="Feature description"
  width={1200}
  height={400}
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZ..."
  placeholder="blur"
/>
```

---

## Features

✅ **Automatic Optimization:**

- WebP/AVIF format conversion
- Responsive srcSet generation
- Lazy loading below the fold
- Quality optimization (default 75)
- Prevents Cumulative Layout Shift (CLS)

✅ **Accessibility:**

- Required `alt` text (SEO + accessibility)
- Proper semantic HTML
- Image size hints to prevent layout shifts

✅ **Performance:**

- Next.js native Image component
- Vercel-optimized delivery
- Browser format negotiation
- Automatic image compression

---

## When to Use `priority`

Use `priority={true}` ONLY for:

- Hero/above-the-fold images
- Logo in header
- Critical visual content

**Do NOT use for:**

- Below-the-fold images
- Images in infinite scroll
- Background images

```typescript
// ✅ CORRECT - Hero image
<OptimizedImage
  src="/images/hero.jpg"
  alt="Verifactu dashboard"
  width={1200}
  height={630}
  priority  // Above the fold
/>

// ❌ WRONG - Feature image
<OptimizedImage
  src="/images/feature-3.jpg"
  alt="Feature"
  width={800}
  height={400}
  priority  // Not needed - below fold
/>
```

---

## Sizes Attribute Guide

The `sizes` attribute tells the browser which image size to download:

```typescript
// Default (automatically used if not specified)
sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

// Full width images
sizes = '100vw';

// Two columns (50% width at desktop)
sizes = '(max-width: 768px) 100vw, 50vw';

// Three columns (33% width)
sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';

// Hero banner (fits container width)
sizes = '(max-width: 768px) 100vw, 1200px';
```

---

## Width & Height Attributes

**Important:** Always provide `width` and `height` to prevent layout shift.

These should be the **intrinsic** dimensions of your image:

```typescript
// Image is 1200x630 pixels
<OptimizedImage
  src="/images/og-image.jpg"
  alt="Social share image"
  width={1200}
  height={630}
/>

// Image is 800x400 pixels
<OptimizedImage
  src="/images/feature.jpg"
  alt="Feature visual"
  width={800}
  height={400}
/>
```

---

## Quality Settings

Default quality: `75` (good balance of quality and file size)

```typescript
// Reduce for photos (good enough quality)
<OptimizedImage
  src="/images/large-photo.jpg"
  alt="Team photo"
  width={1200}
  height={800}
  quality={60}  // Smaller file size
/>

// Increase for logos/graphics
<OptimizedImage
  src="/images/diagram.png"
  alt="System diagram"
  width={800}
  height={600}
  quality={90}  // Better detail
/>
```

---

## Object Fit Options

| Value        | Behavior                                |
| ------------ | --------------------------------------- | --------- |
| `cover`      | Image fills container, may crop         | ← Default |
| `contain`    | Image fits in container, may have space |
| `fill`       | Stretches to fill container             |
| `scale-down` | Smaller of contain or original size     |

```typescript
// Gallery: Image fills card space
<OptimizedImage
  src="/images/feature.jpg"
  alt="Feature"
  width={400}
  height={300}
  objectFit="cover"
/>

// Logo: Fit in space
<OptimizedImage
  src="/brand/logo.png"
  alt="Verifactu logo"
  width={200}
  height={50}
  objectFit="contain"
/>
```

---

## Common Use Cases

### 1. Hero Image (Above Fold)

```typescript
<section className="relative w-full h-96 md:h-screen">
  <OptimizedImage
    src="/images/hero-background.jpg"
    alt="Verifactu dashboard interface"
    width={1920}
    height={1080}
    priority={true}  // Load immediately
    sizes="100vw"
    objectFit="cover"
  />
  {/* Content overlay */}
  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
    <h1>Welcome</h1>
  </div>
</section>
```

### 2. Feature Grid

```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {features.map((feature) => (
    <div key={feature.id} className="aspect-video overflow-hidden rounded-lg">
      <OptimizedImage
        src={feature.image}
        alt={feature.title}
        width={400}
        height={300}
        sizes="(max-width: 768px) 100vw, 33vw"
        objectFit="cover"
      />
    </div>
  ))}
</div>
```

### 3. Logo

```typescript
<header className="flex items-center">
  <OptimizedImage
    src="/brand/logo.svg"
    alt="Verifactu logo"
    width={200}
    height={50}
    quality={90}  // Sharp logo
    objectFit="contain"
  />
</header>
```

### 4. Social Share Image (OG)

```typescript
<OptimizedImage
  src="/brand/social/og-1200x630.png"
  alt="Verifactu - Gestiona tus ventas, gastos y beneficio"
  width={1200}
  height={630}
  quality={85}  // Higher quality for web sharing
/>
```

---

## Files to Update

### Priority Order (High to Low)

#### 1. **page.tsx** (Hero Image)

```typescript
// Add import
import { OptimizedImage } from '@/components/ui';

// Replace any <img> with <OptimizedImage>
// Ensure priority={true} for hero image
```

**Estimated images:** 1-2

#### 2. **components/Features.tsx**

Feature cards, visual demonstrations

**Estimated images:** 3-5

#### 3. **components/HowItWorks.tsx**

Step-by-step visual guides

**Estimated images:** 3-4

#### 4. **components/Testimonials.tsx** (if exists)

User avatars, company logos

**Estimated images:** 5-10

#### 5. **components/Dashboard.tsx** or demo components

Dashboard mockups, interface previews

**Estimated images:** 1-3

#### 6. **Blog posts** (in /recursos or similar)

Article featured images

**Estimated images:** 2-3 per article

---

## Checklist for Implementation

- [ ] Review all `<img>` tags in landing pages
- [ ] Document current images and their dimensions
- [ ] Get intrinsic width/height of each image
- [ ] Plan `sizes` attribute for responsive behavior
- [ ] Replace `<img>` with `<OptimizedImage>` starting with page.tsx
- [ ] Test each image in browser (should load automatically)
- [ ] Test on mobile (images should be responsive)
- [ ] Check Network tab - verify format conversion (webp/avif)
- [ ] Run Lighthouse - Performance score should improve
- [ ] Test with slow 4G throttling
- [ ] Deploy and verify in production

---

## Performance Impact

### Before (using `<img>`)

```
- Full resolution sent to mobile (waste of bandwidth)
- No format negotiation (larger files)
- Potential layout shift (if no width/height)
- Images always loaded (even below fold)
```

### After (using `<OptimizedImage>`)

```
✅ Mobile gets smaller images (responsive srcSet)
✅ Browser downloads optimal format (webp/avif)
✅ No layout shift (width/height provided)
✅ Below-fold images lazy-loaded
✅ Lighthouse Performance: +5-15 points
```

---

## SEO Benefits

✅ **Alt Text:** Required, improves image search visibility  
✅ **Smaller File Size:** Faster load time = better ranking  
✅ **Responsive Design:** Mobile-friendly = better ranking  
✅ **No layout shift:** Better Core Web Vitals = ranking factor

---

## Troubleshooting

### Image not appearing

- Check `src` path (should start with `/`)
- Check `alt` is not empty
- Check width/height are correct

### Lighthouse warning: "Image elements do not have explicit width and height"

- Add `width` and `height` props
- Get intrinsic dimensions: Right-click image → Inspect

### Image stretched or distorted

- Check `objectFit` setting
- Verify width/height aspect ratio matches image
- Use `sizes` attribute for responsive behavior

### Image quality too low

- Increase `quality` prop (75-90 recommended)
- Check image source format (JPG smaller than PNG)

---

## Future Enhancements

- [ ] Implement blur placeholder using `plaiceholder` package
- [ ] Add image optimization script to build process
- [ ] Create image compression guide
- [ ] Set up image CDN with Cloudinary/Imgix (optional)
- [ ] Monitor image performance in Vercel Analytics

---

**Status:** Ready to implement  
**Estimated Time:** 3-4 hours  
**Priority:** Important (performance + SEO boost)  
**Impact:** Lighthouse Performance +5-15 points, Core Web Vitals improvement
