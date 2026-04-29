# Historial de requisitos OpenAI Platform para integraciones (conector Holded)

## 2026-04-29

- Solo se pueden enviar test cases 100% deterministas y reproducibles en entorno público (web y mobile)
- No se debe incluir ningún caso que dependa de datos volátiles, demo, o que pueda fallar por cambios externos
- Es obligatorio ejecutar el smoke test real en entorno público antes de cada submit
- Toda evidencia debe incluir requestId, prompt, resultado y captura de pantalla
- El checklist QA debe estar actualizado y alineado con el preset OpenAI (openai_review_v2)
- No se deben exponer herramientas fuera del scope público definido
- Documentar reviewer notes y expected outcomes para cada caso
- No incluir endpoints, herramientas o flows que no estén 100% validados en producción
- El test pack debe ser el mínimo necesario para cubrir el scope público, sin casos experimentales
- El submit solo se realiza cuando todo pasa en web y mobile, y la evidencia está documentada

## Notas

- Actualizar este historial con cada nueva revisión o feedback de OpenAI
- Usar este historial como referencia para futuras aplicaciones o cambios de scope
