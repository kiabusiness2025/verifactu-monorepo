# Onboarding Empresa - Smoke Test Corto

Fecha: 2026-03-06

## Objetivo
Validar en 3 minutos que el flujo de alta de empresa funciona con:
- búsqueda local/caché,
- fallback manual sin error bloqueante,
- carga de detalle por NIF.

## Precondiciones
- Usuario autenticado en `https://app.verifactu.business`.
- Estar en `/dashboard/onboarding?next=/dashboard`.
- El usuario no debe tener empresa real activa en trial limitada.

## Caso 1: Búsqueda local/caché
1. En `Paso 1 · Buscar empresa`, escribir un término conocido (ej: `ALVILS ESP`).
2. Pulsar `Buscar empresa`.
3. Verificar:
- aparece listado de resultados, o
- aparece mensaje de fuente local/caché sin error rojo.

## Caso 2: Fallback manual
1. Si no hay resultados, pulsar `Introducir datos manualmente`.
2. Verificar:
- se habilita el formulario de `Paso 2 · Confirmar datos`,
- no aparece error técnico bloqueante.

## Caso 3: Carga detalle por NIF
1. Introducir NIF válido en el formulario.
2. Pulsar `Autocompletar empresa`.
3. Verificar:
- se rellenan nombre/razón social (cuando hay datos),
- el resumen básico muestra CIF/NIF y campos de dirección si existen.

## Criterio de aceptación
- El usuario puede completar alta manual aunque la búsqueda externa no responda.
- No aparecen mensajes de proveedor externo en UI.
- Guardar empresa (`Paso 3 · Guardar y continuar`) finaliza sin error 500.
