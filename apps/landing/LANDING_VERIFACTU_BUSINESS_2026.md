# verifactu.business landing - Documentacion integral 2026

## 1) Objetivo de esta guia

Este documento define el estado actual de la web publica de `apps/landing` como un proyecto unico y coherente.

Sirve para:

- Mantener una narrativa estable en todas las rutas
- Evitar contradicciones de copy y CTA
- Alinear producto, conversion y confianza
- Facilitar cambios futuros sin romper coherencia

## 2) Principio de producto en landing

Para la persona usuaria, la promesa central es:

`ventas - gastos = beneficio`

La landing debe transmitir que Isaak simplifica el trabajo fiscal y contable sin friccion, con lenguaje claro y sin tecnicismos para cliente final.

## 3) Modelo de onboarding y activacion (canonico)

Este es el modelo que toda la web debe respetar:

1. Al crear cuenta, la persona entra en Empresa Demo SL
2. Demo SL no caduca
3. Cuando quiere operar con datos reales, activa una prueba real de 30 dias
4. La prueba real permite crear 1 empresa real

No mezclar con mensajes legacy del tipo `1 mes gratis` sin contexto.

## 4) Arquitectura de CTA por profundidad

Cada pagina debe evitar repeticion de CTA y trabajar por etapas:

1. Inicio de pagina (descubrimiento): alta friccion cero
   : `Crear cuenta y entrar en Demo SL`, `Ver como funciona`
2. Mitad de pagina (comparacion y decision): orientacion
   : `Ver planes`, `Ver precios`, `Ver demo`, `Comparar`
3. Final de pagina (activacion): conversion principal o asistida
   : `Activar prueba real 30 dias`, `Hablar con el equipo`

## 5) Rutas canonicas de conversion

- Precios y comparativa: `/precios`
- Planes detallados: `/planes`
- Pagina Holded: `/holded`
- Contacto asistido: CTA a formulario o email de equipo desde bloques finales

Regla de routing:

- En paginas internas, no usar anchors legacy `/#planes`
- Usar rutas directas `/precios` o `/planes` segun intencion

## 6) Inventario funcional por secciones

### 6.1 Home

Archivo principal: `app/page.tsx`

Responsabilidad:

- Presentar promesa general
- Explicar flujo Demo SL -> prueba real
- Conectar con precios y activacion

CTA esperados:

- Inicio: entrada a Demo SL
- Mitad: comparacion y exploracion
- Final: activacion de prueba real o contacto

### 6.2 Holded

Archivo: `app/holded/page.tsx`

Responsabilidad:

- Mensaje de compatibilidad
- Flujo de valor especifico para quien viene desde Holded

CTA esperados por bloque:

- Inicio: entrar en Demo SL
- Mitad: ver integracion y planes
- Final: activar prueba real o solicitar ayuda

### 6.3 Precios

Archivo: `app/precios/page.tsx`

Responsabilidad:

- Comparar oferta de forma clara
- Guiar del entendimiento a la accion

CTA esperados:

- Inicio: ver modelo y empezar
- Mitad: confirmar opcion adecuada
- Final: activar prueba real

### 6.4 Planes

Archivo indice: `app/planes/page.tsx`
Plantilla compartida: `app/planes/_shared.tsx`

Responsabilidad:

- Navegacion por planes
- Detalle por escenario de uso

CTA esperados:

- Inicio: exploracion de plan
- Mitad: comparacion con alternativas
- Final: activacion o contacto

### 6.5 Producto

Archivos:

- `app/producto/resumen/page.tsx`
- `app/producto/plataforma/page.tsx`
- `app/producto/automatizacion/page.tsx`

Responsabilidad:

- Explicar valor sin abrir contradicciones de onboarding
- Enlazar a decision comercial (`/precios` o `/planes`)

### 6.6 Recursos

Archivos:

- `app/recursos/guias-y-webinars/page.tsx`
- `app/recursos/checklist/page.tsx`
- `app/recursos/blog/page.tsx`

Responsabilidad:

- Educar y nutrir confianza
- Cerrar con CTA de siguiente paso

### 6.7 Legal, estado y politicas

Archivos:

- `app/legal/terminos/page.tsx`
- `app/politica-de-precios/page.tsx`
- `app/verifactu/estado/page.tsx`

Responsabilidad:

- Transparencia y seguridad percibida
- Enlaces consistentes a rutas comerciales canonicas

## 7) Componentes compartidos que sostienen coherencia

- FAQ: `app/components/Faq.tsx`
- UI home y footer: `app/lib/home/ui.tsx`
- Header y navegacion: `app/components/Header.tsx` (y variantes segun pagina)

Puntos de control:

- Revisar links comerciales en footer y FAQ
- Revisar copy de prueba/demo en componentes reutilizados
- Evitar duplicar mensajes diferentes para el mismo flujo

## 8) Reglas de copy para mantener coherencia

1. Mantener narrativa de calma y claridad
2. No usar tecnicismos en texto de usuario final
3. Evitar promesas ambiguas de trial
4. Mantener el eje Demo SL + prueba real 30 dias (1 empresa real)
5. Usar CTA distintos por inicio/mitad/final de bloque

## 9) Checklist de QA antes de publicar cambios

1. Routing: no quedan `/#planes` en paginas internas
2. Copy: no hay mensajes legacy que contradigan onboarding
3. CTA: cada bloque tiene intencion distinta (inicio/mitad/final)
4. Build: TypeScript sin errores
5. Visual: revision desktop y mobile de rutas clave

Rutas minimas a revisar manualmente:

- `/`
- `/holded`
- `/precios`
- `/planes`
- `/producto/resumen`
- `/recursos/blog`
- `/politica-de-precios`

## 10) Estado de normalizacion aplicado (marzo 2026)

Se completo una pasada amplia de coherencia para:

- Diversificar CTA por bloques en paginas principales
- Unificar enlaces comerciales en paginas secundarias
- Actualizar mensajes de pricing y trial al modelo Demo SL + prueba real
- Reducir rutas y frases legacy

Si se crean nuevas paginas, deben entrar en este mismo marco antes de merge.
