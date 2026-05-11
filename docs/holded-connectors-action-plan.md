# Plan de accion - Conectores Holded para ChatGPT y Claude

Fecha: 2026-05-10

## Objetivo

Reducir riesgos de revision, seguridad y confianza de usuario en los conectores
Holded para ChatGPT y Claude, manteniendo la arquitectura compartida y la
paridad funcional donde sea razonable.

## Prioridad 0 - Seguridad de acciones de escritura

- Forzar `approveDoc: false` en la tool de ChatGPT que crea borradores de
  factura, al final del payload enviado a Holded.
- Anadir test anti-bypass para impedir que `payload.approveDoc=true` o inputs
  equivalentes puedan emitir una factura.
- Mantener el requisito `confirm: true` y las anotaciones de accion de escritura.

## Prioridad 1 - OAuth y consentimiento Claude

- Restringir `redirect_uri` en registro dinamico y autorizacion OAuth a
  origenes permitidos.
- Validar scopes OAuth (`holded:read`, `holded:write`) y rechazar scopes
  desconocidos.
- Escapar valores HTML en el consent screen, incluidos hidden inputs.
- Activar una CSP compatible con el formulario actual.
- Ocultar la tool de escritura cuando el token solo tenga `holded:read`.

## Prioridad 2 - Datos publicos y experiencia de usuario

- Alinear claims publicos: evitar "oficial" si el texto puede interpretarse
  como endorsement de Holded y evitar numeros de tools que no coincidan con el
  preset real.
- Corregir enlaces legales en formularios ChatGPT/Claude.
- Sustituir URLs antiguas de ayuda de API key por Holded Academy.
- Mostrar nombres de tools reales cuando se escriben como codigo.

## Prioridad 3 - PAT y produccion

- Dar caducidad por defecto a los PAT nuevos.
- Mantener una via explicita para PAT sin caducidad solo cuando se pida.
- Registrar auditoria de uso por tool para PATs.
- Requerir `DATABASE_URL` en produccion para el MCP de Claude, salvo override
  explicito de emergencia.

## Verificacion

- Ejecutar la suite de `apps/holded-mcp`.
- Ejecutar tests focalizados de `apps/app` para tools Holded.
- Revisar metadata y paginas publicas modificadas con busquedas de texto.
