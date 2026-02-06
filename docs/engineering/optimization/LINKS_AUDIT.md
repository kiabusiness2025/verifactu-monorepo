# LINKS AUDIT & OPTIMIZATION GUIDE

**Status:** Audit Template  
**Date:** 2026-01-10  
**Goal:** Perfect link implementation for SEO + Security + UX

---

## Executive Summary

This guide ensures all links on Verifactu.business are:

- ✅ Properly formatted (semantic HTML)
- ✅ Optimized for SEO (internal links use Next.js Link)
- ✅ Secure (external links have rel attributes)
- ✅ Accessible (descriptive text, not "click here")
- ✅ Functional (no 404 links)

---

## 1. LINK TYPES

### Internal Links (Same Domain)

**Use: Next.js `<Link>` component**

```tsx
// ✅ CORRECT
import Link from 'next/link';

<Link href="/pricing">
  View pricing plans
</Link>

// ❌ WRONG
<a href="/pricing">
  View pricing plans
</a>
```

**Benefits of `<Link>`:**

- Automatic route prefetching
- Faster navigation
- Better performance metrics
- Progressive enhancement

### External Links (Different Domain)

**Use: `<a>` tag with security attributes**

```tsx
// ✅ CORRECT
<a
  href="https://example.com"
  rel="noopener noreferrer"
  target="_blank"
  aria-label="External link: Example website"
>
  Visit Example
</a>

// ❌ WRONG
<a href="https://example.com">
  Visit Example
</a>
```

**Required attributes:**

- `rel="noopener noreferrer"` - Security (prevents window.opener access)
- `target="_blank"` - Opens in new tab
- `aria-label` - Accessibility (identifies as external)

### Hash/Anchor Links

```tsx
// ✅ CORRECT - Within same page
<a href="#features">Jump to features</a>

// Define target
<section id="features">
  <h2>Features</h2>
</section>

// ✅ CORRECT - To anchor in different page
<Link href="/guide#section-2">
  See example in guide
</Link>
```

---

## 2. LINK TEXT GUIDELINES

### ❌ BAD PRACTICES

```tsx
// ❌ Generic text (bad for SEO + accessibility)
<Link href="/features">Click here</Link>
<a href="/blog">Read more</a>
<Link href="/dashboard">More info</Link>

// ❌ URL as text (ugly, not user-friendly)
<a href="https://example.com">https://example.com</a>

// ❌ Unnecessary context (adds clutter)
<a href="/features">Our features page</a>
<Link href="/pricing">Pricing information page</Link>
```

### ✅ GOOD PRACTICES

```tsx
// ✅ Descriptive, benefit-focused
<Link href="/features">
  Explore all features
</Link>

// ✅ Action-oriented
<a href="/dashboard" rel="noopener noreferrer" target="_blank">
  Open your dashboard
</a>

// ✅ Context-aware
<Link href="/pricing">
  View our pricing plans
</Link>

// ✅ Specific benefit
<Link href="/blog/tax-guide">
  Complete tax compliance guide for freelancers
</Link>
```

### Context Examples

| Link Text              | Context          | Why                      |
| ---------------------- | ---------------- | ------------------------ |
| "Start free trial"     | CTA button       | Action-oriented, benefit |
| "Learn about features" | Feature section  | Specific purpose         |
| "Read full article"    | Blog teaser      | Clear what to expect     |
| "Contact our team"     | Support section  | Action-focused           |
| "View demo"            | Product showcase | Describes action         |

---

## 3. ACCESSIBILITY REQUIREMENTS

### For Standard Links

```tsx
// Good link text is descriptive enough
<Link href="/features" className="hover:text-indigo-700">
  Explore features
</Link>

// Supplementary aria-label if text isn't clear
<a
  href="https://github.com/verifactu"
  rel="noopener noreferrer"
  target="_blank"
  aria-label="Visit our GitHub repository"
>
  <GithubIcon size={24} />
</a>
```

### For Icon-Only Links

```tsx
// ❌ CURRENT - Icon button with no label
<button>
  <ExternalLinkIcon size={20} />
</button>

// ✅ FIX 1: aria-label
<a
  href="https://docs.example.com"
  rel="noopener noreferrer"
  target="_blank"
  aria-label="Open documentation in new window"
>
  <ExternalLinkIcon size={20} aria-hidden="true" />
</a>

// ✅ FIX 2: title attribute
<a
  href="https://docs.example.com"
  rel="noopener noreferrer"
  target="_blank"
  title="Open documentation in new window"
>
  <ExternalLinkIcon size={20} aria-hidden="true" />
</a>
```

### Keyboard Navigation

```tsx
// All links should be focusable and have visible focus state
a:focus-visible {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}
```

---

## 4. EXTERNAL LINKS - SECURITY

### Why `rel="noopener noreferrer"`?

Without it:

- New page can access `window.opener` (security risk)
- Can redirect original page to phishing site
- User might not notice page changed

```tsx
// ❌ VULNERABLE
<a href="https://external.com" target="_blank">
  External site
</a>

// ✅ SECURE
<a
  href="https://external.com"
  target="_blank"
  rel="noopener noreferrer"
>
  External site
</a>
```

### When to use `rel` values:

| Value                 | Use Case                                    |
| --------------------- | ------------------------------------------- |
| `noopener noreferrer` | External links in new tab (default)         |
| `noopener`            | External links in same tab                  |
| `nofollow`            | Don't pass SEO value (affiliate, untrusted) |
| `sponsored`           | Sponsored links (SEO)                       |
| `ugc`                 | User-generated content (SEO)                |

---

## 5. SAMESITE LINKS

Internal links to your domain should ONLY use `<Link>`:

```tsx
// ✅ CORRECT - Uses Link for prefetching
<Link href="/pricing">
  Pricing
</Link>

<Link href="/pricing#plans">
  Jump to pricing plans
</Link>

// ❌ WRONG - Regular <a> tag (no prefetching benefit)
<a href="/pricing">
  Pricing
</a>
```

---

## 6. COMMON LINKS ON LANDING PAGE

### Header/Navigation

```tsx
import Link from 'next/link';

<nav className="flex gap-6">
  <Link href="/" className="hover:text-indigo-600">
    Home
  </Link>
  <Link href="/features" className="hover:text-indigo-600">
    Features
  </Link>
  <Link href="/pricing" className="hover:text-indigo-600">
    Pricing
  </Link>
  <a
    href="https://docs.verifactu.business"
    rel="noopener noreferrer"
    target="_blank"
    className="hover:text-indigo-600"
  >
    Documentation
  </a>
</nav>;
```

### Footer Links

```tsx
<footer className="bg-gray-900 text-gray-300">
  <div className="grid grid-cols-4 gap-8">
    {/* Product */}
    <div>
      <h3 className="font-semibold mb-4">Product</h3>
      <Link href="/features" className="block mb-2 hover:text-white">
        Features
      </Link>
      <Link href="/pricing" className="block mb-2 hover:text-white">
        Pricing
      </Link>
      <Link href="/security" className="block mb-2 hover:text-white">
        Security
      </Link>
    </div>

    {/* Resources */}
    <div>
      <h3 className="font-semibold mb-4">Resources</h3>
      <a
        href="https://blog.verifactu.business"
        rel="noopener noreferrer"
        target="_blank"
        className="block mb-2 hover:text-white"
      >
        Blog
      </a>
      <a
        href="https://docs.verifactu.business"
        rel="noopener noreferrer"
        target="_blank"
        className="block mb-2 hover:text-white"
      >
        Documentation
      </a>
    </div>

    {/* Legal */}
    <div>
      <h3 className="font-semibold mb-4">Legal</h3>
      <Link href="/privacy" className="block mb-2 hover:text-white">
        Privacy Policy
      </Link>
      <Link href="/terms" className="block mb-2 hover:text-white">
        Terms of Service
      </Link>
    </div>

    {/* Social */}
    <div>
      <h3 className="font-semibold mb-4">Follow Us</h3>
      <a
        href="https://twitter.com/verifactu"
        rel="noopener noreferrer"
        target="_blank"
        aria-label="Follow us on Twitter"
        className="block mb-2 hover:text-white"
      >
        Twitter
      </a>
      <a
        href="https://github.com/verifactu"
        rel="noopener noreferrer"
        target="_blank"
        aria-label="Follow us on GitHub"
        className="block mb-2 hover:text-white"
      >
        GitHub
      </a>
    </div>
  </div>
</footer>
```

### CTA Buttons (Links styled as buttons)

```tsx
// Option 1: Button element
<Link href="/dashboard" className={buttonStyles}>
  Start for free
</Link>;

// Option 2: Using Button component
import { Button } from '@/components/ui';

<Button asChild>
  <Link href="/dashboard">Start for free</Link>
</Button>;
```

---

## 7. LINK AUDIT CHECKLIST

### All Pages

- [ ] Every `<a href>` pointing to external domain has `rel="noopener noreferrer"`
- [ ] Every external link has `target="_blank"`
- [ ] Every `<a>` tag for internal navigation is actually `<Link>`
- [ ] All links have descriptive text (no "click here")
- [ ] Icon-only links have `aria-label`
- [ ] All `href` attributes are valid URLs or paths
- [ ] No 404 links (test with curl or browser)

### SEO

- [ ] Internal links have anchor text with relevant keywords
- [ ] No broken internal links
- [ ] No redirect chains (link → link → link)
- [ ] Sitemap.xml includes all pages
- [ ] robots.txt doesn't block important pages

### Accessibility

- [ ] All links are keyboard focusable (Tab navigation)
- [ ] Focus state is visible (outline or highlight)
- [ ] Links announce correctly on screen readers
- [ ] No link text is "click here" or "read more"
- [ ] External link indicators (aria-label or icon)

### Performance

- [ ] Internal links use `<Link>` (prefetching enabled)
- [ ] No render-blocking external links
- [ ] External resources loaded async/defer where possible

---

## 8. LINKS BY PAGE

### Page: apps/landing/app/page.tsx

```
Main CTA: [Internal] /dashboard → "Start for free"
Pricing: [Internal] /pricing → "View pricing"
Features: [Anchor] #features → "Learn more"
Docs: [External] https://docs.example.com → "Documentation"
```

### Page: apps/landing/app/components/Header.tsx

```
Logo: [Internal] / → home
Navigation: [Internal] /features, /pricing, /contact
Dashboard: [Internal] /dashboard → "Entrar"
```

### Page: apps/landing/app/components/Footer.tsx

```
Company: [Internal] /, /about, /contact
Product: [Internal] /features, /pricing, /security
Resources: [External] blog, docs, API
Legal: [Internal] /privacy, /terms, /cookies
Social: [External] twitter, github, linkedin
```

---

## 9. IMPLEMENTATION STRATEGY

### Step 1: Audit Current Links (1 hour)

```bash
# Search for all <a> tags
grep -r "<a href" apps/landing --include="*.tsx"

# Count external vs internal
grep -r "href=\"https://" apps/landing --include="*.tsx" | wc -l
grep -r "href=\"/" apps/landing --include="*.tsx" | wc -l
```

### Step 2: Convert Internal Links (1 hour)

```tsx
// Before
<a href="/pricing">View pricing</a>;

// After
import Link from 'next/link';
<Link href="/pricing">View pricing</Link>;
```

### Step 3: Add Security to External (1 hour)

```tsx
// Before
<a href="https://example.com">Link</a>

// After
<a href="https://example.com" rel="noopener noreferrer" target="_blank">
  Link
</a>
```

### Step 4: Add Accessibility (30 min)

- Add aria-labels to icon-only links
- Improve generic link text
- Test keyboard navigation

### Step 5: Verify & Test (1 hour)

- Test all links work (no 404s)
- Test keyboard navigation
- Test in screen reader
- Test on mobile

---

## 10. SEO BENEFITS

**Internal Links:**

- Helps crawlers discover all pages
- Distributes PageRank throughout site
- Establishes site hierarchy
- Improves user navigation

**Anchor Text:**

- Should contain relevant keywords
- Helps with page ranking for keywords
- Improves accessibility

**External Links:**

- Shows authority (linking to reputable sources)
- Establishes topical relevance
- Can improve ranking if linking to relevant, high-authority sites

---

## 11. TESTING TOOLS

```bash
# Check for broken links
npx broken-link-checker -r https://verifactu.business

# Validate HTML
npx htmlhint apps/landing/app/**/*.tsx

# Check external links
curl -I https://example.com  # Get HTTP status
```

---

**Status:** Audit ready for implementation  
**Estimated Time:** 3-4 hours  
**Priority:** Important (SEO + Security + Accessibility)  
**Impact:** Better SEO ranking + Improved security + WCAG compliance
