# Plan de ejecución: QA y checklist OpenAI Platform (conector Holded)

## Objetivo

Asegurar que el conector cumple todos los requisitos de OpenAI Platform para pasar la revisión, evitando rechazos por test no deterministas, flows incompletos o evidencia insuficiente.

## 1. Validar el scope público y preset

- Revisar que solo estén expuestas las herramientas y endpoints definidos en el preset openai_review_v2.
- Confirmar que no hay flows experimentales, endpoints internos ni herramientas fuera de scope.

## 2. Ejecutar smoke test real en entorno público

- Acceder a la app en entorno público (web y mobile).
- Ejecutar todos los flows principales definidos en el checklist QA.
- Registrar para cada caso: prompt, resultado, requestId, y evidencia (captura de pantalla).

## 3. Recortar el test pack

- Eliminar cualquier test case que dependa de datos demo, flows inestables o que no sea 100% determinista.
- Mantener solo los casos que siempre pasan en entorno público y están alineados con el scope.

## 4. Actualizar documentación y checklist

- Completar la tabla de evidencia en HOLDED_CONNECTOR_OPENAI_REVIEW_CHECKLIST.md.
- Documentar cualquier reviewer note, expected outcome y pasos QA manuales.
- Enlazar el historial de requisitos para futuras revisiones.

## 5. Validación final antes de submit

- Repetir el smoke test en web y mobile.
- Confirmar que todos los casos pasan y la evidencia está completa.
- Solo proceder al submit cuando todo esté validado y documentado.

## 6. Post-submit

- Si hay feedback o rechazo, actualizar el historial de requisitos y checklist.
- Ajustar flows, test pack y documentación según feedback recibido.

---

Este plan debe ejecutarse antes de cada submit a OpenAI Platform para asegurar cumplimiento y evitar rechazos por motivos de QA o evidencia insuficiente.
