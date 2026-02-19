# QA Checklist - Demo (/demo)

Checklist rápida (5-10 min) para validar la demo tras cada deploy.

## Preparación

1. Abrir ventana incógnito.
2. Ir a `https://app.verifactu.business/demo`.
3. Verificar que no hay sesión iniciada.

## Validación funcional

1. Inicio:
- Carga sin error 500.
- Se ve banner "Modo demo" y CTA "Probar con mis datos (1 mes gratis)".
- Se ven bloques con datos simulados (PyG, facturas, Isaak).

2. Menú lateral:
- Navegar y comprobar que cargan:
  - `/demo/invoices`
  - `/demo/clients`
  - `/demo/banks`
  - `/demo/documents`
  - `/demo/calendar`
  - `/demo/settings`

3. Acciones bloqueadas:
- Pulsar botones como `+ Nueva factura`, `Conectar banco`, `Subir documento`.
- Debe aparecer mensaje tipo "Disponible al activar tu prueba".
- No debe ejecutarse ninguna operación real.

4. Isaak:
- Ver botón flotante de Isaak en demo.
- Abrir chat y enviar una pregunta.
- Verificar que responde sin romper la página.
- Comprobar que aparecen mensajes proactivos en secciones del menú.

5. Conversión:
- Pulsar CTA "Probar con mis datos (1 mes gratis)".
- Debe redirigir a login con retorno a onboarding.

## Validación técnica mínima

1. Consola del navegador:
- Sin errores críticos de render de Server Components.

2. Network:
- Sin bucle de errores 5xx.
- `/api/monitor/error` puede devolver `204` (esperado).

3. Middleware:
- `/demo` accesible sin autenticación.
- `/dashboard` sigue protegido (redirige a login sin sesión).

## Criterio de pase

- Todo el flujo demo navega sin errores críticos.
- El contenido es visible en todas las secciones del menú.
- Las acciones sensibles están bloqueadas correctamente.
- Isaak flotante funciona y la CTA de conversión redirige bien.
