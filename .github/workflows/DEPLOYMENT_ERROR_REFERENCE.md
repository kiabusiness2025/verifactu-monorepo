# 🚨 Deployment Error Reference Guide

Este documento lista todos los errores de despliegue conocidos que pueden causar paradas en Vercel. El workflow `isaak-auto-fix.yml` detecta y corrige automáticamente estos patrones.

---

## Categoría 1: Import Errors

### Error 1: `@/lib/auth` imports (doesn't exist)
**Symptom:** `Can't resolve '@/lib/auth'`
**Root Cause:** Archivo no existe. La autenticación está en `@/lib/session`
```typescript
// ❌ WRONG
import { getSession } from '@/lib/auth';
const session = await getSession();

// ✅ CORRECT
import { getSessionPayload } from '@/lib/session';
const session = await getSessionPayload();
```
**Auto-Fixed By:** Workflow step "Fix 1: AUTH_IMPORT"

---

### Error 2: Named `{ prisma }` imports
**Symptom:** `Named import 'prisma' not found`
**Root Cause:** Prisma client se exporta como default, no named export
```typescript
// ❌ WRONG
import { prisma } from '@/lib/prisma';

// ✅ CORRECT
import prisma from '@/lib/prisma';
```
**Auto-Fixed By:** Workflow step "Fix 2: PRISMA_IMPORT"

---

### Error 3: `@/lib/firebaseAdmin` imports (deprecated)
**Symptom:** Module not found / initialization issues
**Root Cause:** Este módulo fue eliminado o renombrado
```typescript
// ❌ WRONG
import { initFirebaseAdmin } from '@/lib/firebaseAdmin';
initFirebaseAdmin();

// ✅ CORRECT
// Remove these imports completely
```
**Auto-Fixed By:** Workflow step "Fix 3: FIREBASE_IMPORT"

---

### Error 4: Email template import paths (landing)
**Symptom:** `Can't find module '../emails/...'`
**Root Cause:** Imports desde `lib/email/` usando caminos relativos incorrectos
```typescript
// ❌ WRONG (from lib/email/index.ts)
import { WelcomeEmail } from '../emails/Welcome';

// ✅ CORRECT (go up 2 levels)
import { WelcomeEmail } from '../../emails/Welcome';
```
**Auto-Fixed By:** Workflow step "Fix 13: EMAIL_IMPORT"

---

## Categoría 2: Session & Authentication Errors

### Error 5: `getSession()` without "Payload"
**Symptom:** `getSession` not found or wrong function signature
**Root Cause:** Usaste el nombre de función incorrecto
```typescript
// ❌ WRONG
const session = await getSession();

// ✅ CORRECT
const session = await getSessionPayload();
```
**Auto-Fixed By:** Workflow step "Fix 4: SESSION_CALL"

---

### Error 6: `getSessionPayload(req)` with arguments
**Symptom:** `Expected 0 arguments, but got 1`
**Root Cause:** Esta función NO acepta argumentos (lee cookies internamente)
```typescript
// ❌ WRONG
const session = await getSessionPayload(req);

// ✅ CORRECT
const session = await getSessionPayload();
```
**Auto-Fixed By:** Workflow step "Fix 10: SESSION_PAYLOAD_ARG"

---

### Error 7: Wrong property `session.tenant.id`
**Symptom:** Property 'tenant' does not exist on type 'SessionPayload'
**Root Cause:** SessionPayload tiene `tenantId`, no `tenant` object
```typescript
// ❌ WRONG
const tenantId = session.tenant.id;
const userId = session.user.id;

// ✅ CORRECT
const tenantId = session.tenantId;
const userId = session.uid;
```
**Auto-Fixed By:** Workflow step "Fix 5: SESSION_PROPERTY"

---

### Error 8: Wrong session validation pattern
**Symptom:** Unnecessary complexity / optional chaining issues
**Root Cause:** Intento de usar patrones que no existen
```typescript
// ❌ WRONG
if (!session?.user?.id || !session?.tenant?.id) { ... }

// ✅ CORRECT
if (!session || !session.tenantId) { ... }
```
**Auto-Fixed By:** Workflow step "Fix 6: SESSION_VALIDATION"

---

## Categoría 3: Type Guard Errors (Most Common)

### Error 9: Incomplete type guard (missing `!session.uid`)
**Symptom:** `Type 'string | undefined' is not assignable to type 'string'`
**Root Cause:** Type guard solo verifica `!session` pero luego accedes a `session.uid`
```typescript
// ❌ WRONG
const session = await getSessionPayload();
if (!session) return error;
const userId = session.uid;  // TypeScript: uid could be undefined!

// ✅ CORRECT
const session = await getSessionPayload();
if (!session || !session.uid) return error;
const userId = session.uid;  // TypeScript: definitely string!
```
**Auto-Fixed By:** Workflow step "Fix 8: INCOMPLETE_TYPE_GUARD"

---

### Error 10: Type guard too simple (only checks `!session`)
**Symptom:** `Type 'string | undefined' is not assignable to type 'string'`
**Root Cause:** Cuando accedes a `session.tenantId` pero type guard es débil
```typescript
// ❌ WRONG
if (!session) return error;
const tenantId = session.tenantId;  // Error: could be undefined

// ✅ CORRECT
if (!session || !session.tenantId) return error;
const tenantId = session.tenantId;  // Safe!
```
**Auto-Fixed By:** Workflow step "Fix 11: INSUFFICIENT_TYPE_GUARD"

---

### Error 11: Missing createdBy in Prisma operations
**Symptom:** `Type 'string | undefined' is not assignable to type 'string'` en invoice.createdBy
**Root Cause:** Campo `createdBy` es requerido pero no se incluye
```typescript
// ❌ WRONG
const invoice = await prisma.invoice.create({
  data: {
    tenantId: session.tenantId,
    customerId: data.customerId,
    // Missing: createdBy
  }
});

// ✅ CORRECT
const invoice = await prisma.invoice.create({
  data: {
    tenantId: session.tenantId,
    createdBy: session.uid,  // ← REQUIRED
    customerId: data.customerId,
  }
});
```
**Auto-Fixed By:** Workflow step "Fix 12: MISSING_CREATED_BY"

---

## Categoría 4: Schema & Field Errors

### Error 12: Using `dueDate` field (doesn't exist)
**Symptom:** `Unknown field 'dueDate' in 'InvoiceUncheckedCreateInput'`
**Root Cause:** Invoice schema no tiene este campo
```typescript
// ❌ WRONG
const invoice = await prisma.invoice.create({
  data: {
    tenantId: session.tenantId,
    dueDate: new Date(data.dueDate),  // ← Doesn't exist!
    issueDate: new Date(),
  }
});

// ✅ CORRECT
const invoice = await prisma.invoice.create({
  data: {
    tenantId: session.tenantId,
    issueDate: new Date(),  // Use issueDate only
  }
});
```
**Auto-Fixed By:** Workflow step "Fix 7: INVOICE_FIELD"

---

## Categoría 5: Decimal/Number Arithmetic Errors

### Error 13: Direct Decimal arithmetic without `.toNumber()`
**Symptom:** `Operator '+' cannot be applied to types 'Decimal' and 'Decimal'`
**Root Cause:** Prisma Decimal objects no pueden sumarse directamente
```typescript
// ❌ WRONG
const total = invoice.amountNet + invoice.amountTax;

// ✅ CORRECT (Option 1: Convert first)
const netNum = typeof invoice.amountNet === 'number' 
  ? invoice.amountNet 
  : invoice.amountNet.toNumber();
const taxNum = typeof invoice.amountTax === 'number' 
  ? invoice.amountTax 
  : invoice.amountTax.toNumber();
const total = netNum + taxNum;

// ✅ CORRECT (Option 2: Let database do the math)
// Use Prisma's raw operations or update in separate step
```
**Auto-Fixed By:** Workflow step "Fix 9: DECIMAL_ARITHMETIC"

---

### Error 14: Other Decimal operations
**Symptom:** Similar to Error 13, but with multiplication, division, etc.
**Root Cause:** Cualquier operación aritmética con Decimal
```typescript
// ❌ WRONG
const lineTotal = quantity * unitPrice;  // If these are Decimal

// ✅ CORRECT
const lineTotal = BigInt(quantity) * BigInt(unitPrice);
// OR convert to number first
```
**Auto-Fixed By:** Workflow step "Fix 13: DECIMAL_OPERATIONS" (manual fix often needed)

---

## How the Workflow Works

```
┌─────────────────────────────────────┐
│  Push to main or manual trigger     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Checkout code and run diagnostics  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Detect 14 error categories         │
│  - Using grep patterns              │
│  - Mark which errors found          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  If errors detected:                │
│  - Apply sed-based fixes            │
│  - Run all applicable fixes         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check if changes were made         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  If changes:                        │
│  - Commit with detailed message     │
│  - Push to main                     │
│  - Vercel auto-redeploys            │
└─────────────────────────────────────┘
```

---

## SessionPayload Type Definition

```typescript
// Location: @/lib/session
export interface SessionPayload {
  uid: string;           // User ID from Firebase
  email: string;         // User email
  tenantId: string;      // Current tenant/company ID
  name?: string;         // User name (optional)
  picture?: string;      // Profile picture (optional)
}

// CORRECT USAGE
const session = await getSessionPayload();
if (!session || !session.tenantId || !session.uid) {
  return error;
}
const { uid, tenantId, email } = session;  // Now all definitely string
```

---

## Testing the Fixes

To verify fixes work:

```bash
# 1. Create a test file with a known error
echo "import { getSession } from '@/lib/auth';" > test-error.ts

# 2. Run the workflow manually
# Go to GitHub Actions → isaak-auto-fix → Run workflow

# 3. Check if it was fixed
git pull
cat test-error.ts  # Should now have '@/lib/session'
```

---

## Performance Notes

- **Detection Time**: ~2-3 seconds per scan
- **Fix Time**: ~1-2 seconds
- **Total Workflow**: ~30-45 seconds
- **Vercel Redeploy**: ~2-3 minutes after push

---

## Future Enhancements

Patterns to add when discovered:
- [ ] More Decimal operation patterns
- [ ] Database transaction errors
- [ ] API response type mismatches
- [ ] Missing error handling patterns
- [ ] Async/await callback hell

---

**Last Updated:** January 15, 2026
**Maintained By:** Isaak Auto-Fix Bot
**Trigger:** Every push to main OR manual GitHub Actions run
