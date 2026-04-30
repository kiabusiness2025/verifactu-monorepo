# Fase 4 — Stripe Price ID Configuration

**Objetivo:** Completar la separación de Isaak como producto independiente en Stripe.

**Estado:** Administrativo (requiere acceso a Vercel + Stripe)

---

## Paso 1: Crear Price ID en Stripe (si no existe)

1. Ve a [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Crea un nuevo producto o usa uno existente llamado **"Isaak"**
3. Crea un nuevo precio **mensual** con:
   - Name: `Isaak Monthly` (o similar)
   - Billing period: Monthly
   - Amount: Define según la estrategia (puede ser el mismo que Holded por ahora)
   - Currency: EUR
4. Copia el **Price ID** (comienza con `price_`)

---

## Paso 2: Agregar variable en Vercel (apps/isaak)

1. Ve a [Vercel Dashboard → Projects → verifactu-isaak](https://vercel.com)
2. Entra en **Settings → Environment Variables**
3. Agrega una nueva variable:
   - **Name:** `STRIPE_PRICE_ISAAK_MONTHLY`
   - **Value:** `price_XXXXX` (el ID del paso anterior)
   - **Environments:** Production, Preview, Development

---

## Paso 3: Validar configuración

- [ ] La variable aparece en Vercel dashboard
- [ ] Deploy automático se dispara
- [ ] En producción, `apps/isaak/app/lib/settings.ts` ahora lee `STRIPE_PRICE_ISAAK_MONTHLY` primero (línea ~159)
- [ ] Si no hay `STRIPE_PRICE_ISAAK_MONTHLY`, cae a `STRIPE_PRICE_HOLDED_FISCAL_MONTHLY` (fallback)

---

## Notas

- Actualmente, `STRIPE_PRICE_ISAAK_MONTHLY` puede tener el mismo valor que `STRIPE_PRICE_HOLDED_FISCAL_MONTHLY`
- En el futuro, cuando Isaak tenga precio independiente, actualizar el valor aquí
- El fallback garantiza que si no está configurado, no se rompe (usa Holded)
