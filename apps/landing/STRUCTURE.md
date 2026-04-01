# Landing - estructura y coherencia 2026

## Objetivo

Este archivo describe la estructura funcional de la landing publica y su marco de coherencia actual.

Referencia principal:

- `LANDING_VERIFACTU_BUSINESS_2026.md`

## Estructura de alto nivel

```
apps/landing/
├── app/
│   ├── api/
│   │   ├── send-lead/route.ts
│   │   ├── chat/route.ts
│   │   ├── stripe/webhook/route.ts
│   │   └── ...
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Faq.tsx
│   │   └── ...
│   ├── lib/
│   │   └── home/ui.tsx
│   ├── page.tsx
│   ├── holded/page.tsx
│   ├── precios/page.tsx
│   ├── planes/
│   │   ├── page.tsx
│   │   └── _shared.tsx
│   ├── producto/
│   ├── recursos/
│   ├── legal/
│   ├── politica-de-precios/
│   └── verifactu/
├── public/
├── middleware.ts
├── next.config.js
└── README.md
```

## Paginas de conversion clave

1. `/` (home)
2. `/holded`
3. `/precios`
4. `/planes`

## Paginas de soporte de decision

1. `/producto/*`
2. `/recursos/*`
3. `/politica-de-precios`
4. `/legal/*`
5. `/verifactu/estado`

## Componentes compartidos criticos

1. `app/components/Header.tsx`
   : Coherencia de navegacion y accesos principales
2. `app/components/Faq.tsx`
   : Cierre de objeciones y rutas a conversion
3. `app/lib/home/ui.tsx`
   : Bloques comunes y footer con links comerciales
4. `app/planes/_shared.tsx`
   : Plantilla base de planes y CTA por etapa

## Contratos de coherencia

### 1) Flujo de onboarding visible en copy

1. Crear cuenta
2. Entrar en Empresa Demo SL
3. Demo SL sin caducidad
4. Activar prueba real de 30 dias (1 empresa real) cuando se quiera operar en real

### 2) CTA por tramo de lectura

1. Inicio de bloque: descubrimiento
2. Mitad: comparacion
3. Final: activacion o contacto

### 3) Routing comercial canonico

1. Comparativa y decision: `/precios`
2. Profundidad de oferta: `/planes`

No usar anchors legacy `/#planes` en paginas internas.

## Endpoints principales usados en landing

1. `POST /api/send-lead`
2. `POST /api/chat`
3. `POST /api/stripe/webhook`

## QA minima al tocar estructura o copy

1. Revisar que no reaparecen enlaces legacy
2. Revisar que no se rompe el flujo Demo SL -> prueba real
3. Verificar CTA distintos por inicio/mitad/final
4. Ejecutar build o typecheck de landing antes de merge
