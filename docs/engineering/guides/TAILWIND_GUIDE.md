# Tailwind CSS Guide

## 🎨 What is Tailwind?

Tailwind CSS is a utility-first CSS framework. Instead of writing CSS classes, you compose styles using pre-defined utility classes.

**Key Benefits:**
- ✅ No custom CSS (usually)
- ✅ Consistent design system
- ✅ Responsive design built-in
- ✅ Dark mode support
- ✅ Fast development

---

## 🚀 Quick Start

### Basic Usage

Instead of writing CSS:
```css
/* ❌ Don't do this */
.button {
  padding: 12px 24px;
  background-color: blue;
  border-radius: 8px;
  font-weight: 600;
}
```

Use Tailwind classes:
```jsx
// ✅ Do this
<button className="px-6 py-3 bg-blue-500 rounded-lg font-semibold">
  Click me
</button>
```

### File Structure

```
apps/app/
├── app/
│   └── globals.css        # Tailwind config imports
├── tailwind.config.ts     # Tailwind configuration
└── tsconfig.json          # TypeScript paths
```

---

## 🎯 Common Classes

### Spacing (Padding & Margin)

```jsx
// Padding
p-4       // padding: 1rem (16px)
px-6      // padding-left/right: 1.5rem
py-2      // padding-top/bottom: 0.5rem
pt-8      // padding-top only

// Margin
m-4       // margin: 1rem
mx-auto   // margin-left/right: auto (center)
mb-6      // margin-bottom only
```

### Colors

```jsx
// Background colors
bg-white
bg-blue-500
bg-gray-200
bg-red-600

// Text colors
text-white
text-gray-600
text-blue-500

// Border colors
border-gray-300
border-blue-500
```

### Sizing

```jsx
// Width
w-full        // width: 100%
w-1/2         // width: 50%
w-64          // width: 16rem (256px)
max-w-2xl     // max-width: 42rem

// Height
h-12          // height: 3rem (48px)
h-full        // height: 100%
min-h-screen  // min-height: 100vh
```

### Typography

```jsx
// Font sizes
text-sm       // 0.875rem
text-base     // 1rem
text-lg       // 1.125rem
text-2xl      // 1.5rem

// Font weight
font-light    // 300
font-normal   // 400
font-semibold // 600
font-bold     // 700

// Text alignment
text-left
text-center
text-right
```

### Flexbox & Grid

```jsx
// Flex layouts
flex                  // display: flex
justify-center        // justify-content: center
items-center          // align-items: center
gap-4                 // gap: 1rem

// Grid layouts
grid
grid-cols-3           // 3 equal columns
gap-6                 // spacing between items

// Direction
flex-col              // flex-direction: column
flex-row              // flex-direction: row (default)
```

### Borders & Shadows

```jsx
// Borders
border                // border: 1px solid currentColor
border-2              // 2px border
border-gray-300       // border color
rounded               // border-radius: 0.25rem
rounded-lg            // 0.5rem radius
rounded-full          // 50% (circles)

// Shadows
shadow                // subtle shadow
shadow-lg             // large shadow
shadow-2xl            // extra large shadow

// Hover effects
hover:bg-blue-600     // on hover
hover:underline
hover:shadow-lg
```

### Display & Position

```jsx
// Display
block
inline-block
flex
grid
hidden              // display: none

// Position
relative
absolute
fixed
sticky

// Z-index
z-10
z-50
z-auto
```

---

## 📱 Responsive Design

Tailwind uses breakpoints for responsive design:

```
sm  640px
md  768px
lg  1024px
xl  1280px
2xl 1536px
```

Usage:
```jsx
<div className="
  w-full           // Mobile: 100%
  md:w-1/2         // Tablet: 50%
  lg:w-1/3         // Desktop: 33%
  px-4             // Mobile: padding
  md:px-6          // Tablet: more padding
">
  Content
</div>
```

### Common Patterns

```jsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive text size
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Responsive margins
<div className="mt-4 md:mt-8 lg:mt-12">

// Hide on mobile
<div className="hidden md:block">
  Desktop only
</div>

// Show on mobile
<div className="block md:hidden">
  Mobile only
</div>
```

---

## 🌙 Dark Mode

Tailwind has built-in dark mode support.

```jsx
// Light mode (default)
<div className="bg-white text-black">

// Dark mode
<div className="dark:bg-gray-900 dark:text-white">

// Both responsive
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
```

Enable in `tailwind.config.ts`:
```typescript
export default {
  darkMode: 'class', // or 'media'
}
```

---

## ✨ Advanced Features

### Arbitrary Values

```jsx
// Use custom values
<div className="top-[117px]">    // top: 117px
<div className="w-[500px]">      // width: 500px
<div className="bg-[#1da1f2]">   // custom color
```

### Combine Classes Dynamically

```typescript
const buttonClasses = [
  'px-4 py-2',
  'rounded-lg',
  'font-semibold',
  isActive && 'bg-blue-500',
  isDark && 'dark:bg-gray-700',
].filter(Boolean).join(' ');

<button className={buttonClasses}>
```

Better with libraries:
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...classes) => twMerge(clsx(classes));

<button className={cn('px-4 py-2', isActive && 'bg-blue-500')}>
```

### Custom Components

In `globals.css`:
```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}
```

Then use in JSX:
```jsx
<button className="btn-primary">Click</button>
<div className="card">Content</div>
```

### Custom Colors

In `tailwind.config.ts`:
```typescript
export default {
  theme: {
    extend: {
      colors: {
        brand: '#1da1f2',
        'brand-dark': '#1a91da',
      },
    },
  },
}
```

Usage:
```jsx
<div className="bg-brand text-white">
```

---

## 🎯 Best Practices

### ✓ Do's
- ✓ Use built-in colors (avoid arbitrary values unless necessary)
- ✓ Use responsive prefixes (md:, lg:)
- ✓ Extract repeated classes to components
- ✓ Use `@apply` for common patterns
- ✓ Keep class names concise
- ✓ Use dark mode utilities

### ✗ Don'ts
- ✗ Don't override with inline CSS
- ✗ Don't use !important
- ✗ Don't mix Tailwind with CSS modules
- ✗ Don't repeat long class strings
- ✗ Don't use arbitrary values excessively

---

## 💡 Common Patterns

### Card Component

```jsx
<div className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-800">
  <h2 className="text-2xl font-bold mb-4 dark:text-white">Title</h2>
  <p className="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

### Button Variants

```jsx
// Primary button
<button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition">

// Secondary button
<button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">

// Disabled button
<button disabled className="px-6 py-2 bg-gray-300 text-gray-500 cursor-not-allowed">
```

### Flex Container

```jsx
<div className="flex items-center justify-between gap-4">
  <div>Left content</div>
  <div>Right content</div>
</div>
```

### Grid Layout

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-lg p-4 shadow">
      {item.name}
    </div>
  ))}
</div>
```

---

## 🔧 Configuration

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
      spacing: {
        // Custom spacing
      },
    },
  },
  plugins: [
    // Tailwind plugins
  ],
} satisfies Config
```

---

## 🚨 Troubleshooting

### Styles Not Showing

**Problem:** Tailwind classes don't apply

**Solution:**
1. Check `content` paths in `tailwind.config.ts`
2. Verify CSS import in layout
3. Check class names spelling
4. Restart dev server

```bash
pnpm dev  # Restart to rebuild Tailwind
```

### Performance

**Problem:** CSS file too large

**Solution:**
- Remove unused colors from `extend`
- Use `@apply` for repeated patterns
- Let Tailwind purge unused classes (automatic in production)

### Conflicts

**Problem:** Styles conflict with other CSS

**Solution:**
```css
/* Increase specificity if needed */
@layer utilities {
  .your-class {
    /* Styles */
  }
}
```

---

## 📚 Related Documentation

- [Tailwind Official Docs](https://tailwindcss.com/docs)
- [Tailwind UI Components](https://tailwindui.com)
- [Headless UI](https://headlessui.com)

---

Last updated: January 2026
