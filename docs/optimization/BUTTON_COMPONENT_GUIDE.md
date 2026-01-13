# BUTTON COMPONENT IMPLEMENTATION GUIDE

**Component:** apps/landing/app/components/ui/Button.tsx  
**Status:** ✅ Created and ready to use  
**Date:** 2026-01-10

---

## Quick Start

```typescript
import { Button } from '@/components/ui/Button';

// Basic usage
<Button>Click me</Button>

// With variant and size
<Button variant="primary" size="lg">
  Empezar gratis
</Button>

// Loading state
<Button isLoading>
  Procesando...
</Button>

// Full width
<Button fullWidth variant="secondary">
  Cancelar
</Button>
```

---

## Variants

| Variant | Use Case | Colors |
|---------|----------|--------|
| `primary` | Main CTA, important actions | Indigo 600/700/800 |
| `secondary` | Alternative actions | Gray 200/300/400 |
| `ghost` | Links that look like buttons | Transparent/Gray |
| `danger` | Delete, cancel, destructive | Red 600/700/800 |
| `success` | Confirm, complete, success | Green 600/700/800 |

---

## Sizes

| Size | Padding | Font Size | Use Case |
|------|---------|-----------|----------|
| `sm` | px-3 py-1.5 | text-sm | Inline, compact |
| `md` | px-4 py-2 | text-base | Standard (default) |
| `lg` | px-6 py-3 | text-lg | Hero CTAs, prominent |
| `xl` | px-8 py-4 | text-lg | Full-width hero buttons |

---

## Accessibility Features

✅ **Built-in:**
- `aria-busy` when loading
- `aria-disabled` when disabled
- `focus:ring-2` for visible focus
- Disabled state styling
- Loading spinner with `aria-hidden`
- Forward ref support

✅ **Properties:**
```typescript
interface ButtonProps {
  // Standard HTML attributes
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  
  // Custom props
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
```

---

## Common Patterns

### Hero CTA
```typescript
<Button variant="primary" size="lg" fullWidth>
  Empezar gratis
</Button>
```

### Inline Actions
```typescript
<Button variant="ghost" size="sm">
  Leer más
</Button>
```

### Form Submission
```typescript
<Button
  type="submit"
  variant="primary"
  isLoading={isLoading}
  disabled={isLoading}
>
  {isLoading ? 'Guardando...' : 'Guardar cambios'}
</Button>
```

### Icon Button
```typescript
import { ChevronRight } from 'lucide-react';

<Button variant="ghost" icon={<ChevronRight size={20} />}>
  Siguiente
</Button>
```

### Danger Action
```typescript
<Button
  variant="danger"
  onClick={() => confirm('¿Eliminar?')}
>
  Eliminar
</Button>
```

---

## Files to Update

### 1. **page.tsx** (Hero CTA)
**Current:**
```typescript
className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
```

**New:**
```typescript
<Button variant="primary" size="lg">
  Empezar gratis
</Button>
```

**Location:** Hero section, "Empezar gratis" button

---

### 2. **components/Features.tsx** (Feature CTAs)
**Current:** Button-like divs with custom classes  
**New:** Use `<Button variant="secondary">` or `<Button variant="ghost">`

---

### 3. **components/PricingModal.tsx** (Pricing buttons)
**Current:** Custom button styles  
**New:**
```typescript
<Button variant="primary" fullWidth>
  Seleccionar plan
</Button>
<Button variant="secondary" fullWidth>
  Cambiar plan
</Button>
```

---

### 4. **components/Faq.tsx** (Toggle button)
**Current:**
```typescript
className="flex w-full items-center justify-between py-3 text-left font-medium text-gray-900 hover:text-indigo-600 transition-colors"
```

**New:**
```typescript
<Button
  variant="ghost"
  fullWidth
  onClick={() => toggleExpand(item.id)}
  aria-expanded={expandedId === item.id}
  aria-controls={`faq-answer-${item.id}`}
>
  <span className="text-left">{item.question}</span>
  <ChevronDown
    size={20}
    className={`transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
  />
</Button>
```

---

### 5. **components/Header.tsx** (Navigation buttons)
**Current:** Hardcoded button styles  
**New:**
```typescript
<Button
  variant="primary"
  size="sm"
  onClick={() => router.push('/login')}
>
  Entrar
</Button>
<Button
  variant="ghost"
  size="sm"
>
  Más
</Button>
```

---

### 6. **Footer or Contact Section**
Replace all custom button implementations:
```typescript
// Search for: className=".*bg-.*text-white.*rounded"
// Replace with: <Button variant="primary">

// Search for: className=".*border.*gray"
// Replace with: <Button variant="secondary">
```

---

## Checklist for Implementation

- [ ] Import Button component in page.tsx
- [ ] Replace hero CTA button
- [ ] Import Button in Features.tsx
- [ ] Replace feature action buttons
- [ ] Import Button in PricingModal.tsx
- [ ] Replace pricing buttons
- [ ] Import Button in Faq.tsx
- [ ] Update FAQ toggle button (already started in component)
- [ ] Import Button in Header.tsx
- [ ] Replace header action buttons
- [ ] Search for inline button styles and consolidate
- [ ] Test all variants in browser
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Test disabled state
- [ ] Test loading state
- [ ] Run `pnpm build` to ensure no errors
- [ ] Run `pnpm dev` and test locally
- [ ] Deploy to Vercel

---

## Testing Checklist

### Visual Testing
- [ ] Primary button appears with indigo background
- [ ] Secondary button appears with gray background
- [ ] Ghost button appears transparent
- [ ] Hover states work correctly
- [ ] Active/pressed states scale down slightly
- [ ] Disabled button appears grayed out
- [ ] Loading spinner appears and animates

### Accessibility Testing
- [ ] Tab through page - all buttons are focusable
- [ ] Focus indicators visible on all buttons
- [ ] Screen reader announces button text correctly
- [ ] Loading state announced (aria-busy)
- [ ] Disabled state announced (aria-disabled)
- [ ] Keyboard (Enter, Space) activates buttons

### Mobile Testing
- [ ] Buttons are at least 44x44px (touch target)
- [ ] Touch feedback works
- [ ] No unintended zoom on input focus
- [ ] Responsive sizing on small screens

---

## Performance Impact

✅ **Positive:**
- Consistent component reduces code duplication
- Shared styles loaded once
- Better tree-shaking (dead code elimination)
- Smaller bundle size overall

✅ **No negative impact:**
- Component is lightweight (no heavy dependencies)
- Uses Tailwind CSS classes (already in project)
- No external libraries beyond React

---

## Migration from Old Buttons

**Before:**
```typescript
<div
  onClick={handleClick}
  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
>
  Click me
</div>
```

**After:**
```typescript
<Button onClick={handleClick} variant="primary">
  Click me
</Button>
```

---

## Notes

- Button is fully TypeScript typed
- Forwarded ref support (use `ref` if needed)
- All Tailwind classes are production-safe
- No external dependencies required
- Works with Next.js 14+
- Compatible with Vercel deployment

---

**Status:** Ready to implement  
**Estimated Time:** 2-3 hours  
**Priority:** Critical (consistency + maintainability)
