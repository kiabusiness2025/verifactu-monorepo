# Isaak V1 Sprint Plan — 2026-06-02

> Base de trabajo: rama limpia `deploy/origin-main-clean-2026-06-02`.
> El objetivo inmediato es cerrar el corte V1 y mantener todas las demás capacidades como roadmap V2+.

## Sprint A — Surface V1 (1-2 días)

- [ ] Confirmar `ISAAK_V1_LAUNCH=true` en Vercel y validar que la app oculta la superficie avanzada.
- [ ] Limitar sidebar a 4 entradas: `/chat`, `/resumen`, `/alertas`, `/settings`.
- [ ] Mantener onboarding de 1 paso: signup + conectar Holded.
- [ ] Mostrar solo Holded en `/integrations`; ocultar canales avanzados y integraciones externas.
- [ ] Verificar que `/banking`, `/mail`, `/calendario`, `/whatsapp`, `/microsoft`, `/fiscal/*`, `/auditoria`, `/inspector`, `/sede`, `/perfil-fiscal`, `/contactos`, `/equipo`, `/advisor` y demás páginas avanzadas estén detrás de la feature flag.
- [ ] Ejecutar smoke test básico: sidebar + onboarding + chat + Holded.

## Sprint B — Core V1 (3-5 días)

- [ ] Verificar corpus AEAT en el system prompt con preguntas tipo AEAT.
- [ ] Asegurar portado/cierre de tools Holded V1 críticas.
- [ ] Reemplazar emisión directa por `create_invoice_draft` y validar la experiencia de confirmación.
- [ ] Validar alertas fiscales end-to-end para D-15/7/3/1.
- [ ] Simplificar `/resumen` a 4 cards clave: ventas, gastos, IVA, próximo vencimiento.
- [ ] Simplificar `/alertas` a lista activa + histórico.
- [ ] Cerrar trial Stripe 14 días sin tarjeta y revisar webhook de expiración.
- [ ] Confirmar que `CORPUS_PDF_EXTRACTOR_ENABLED=1` está activo en Vercel.

## Sprint C — Hub, landing y lanzamiento (3-4 días)

> **Dominios actualizados**: app web = `isaak.chat` · landing producto = `isaak.app` · hub plataforma = `verifactu.business`

- [ ] Rediseñar `verifactu.business` como hub de 3 productos (con enlace a `isaak.app`).
- [ ] Finalizar landing dedicada `isaak.app` (antes `isaak.verifactu.business`).
- [ ] Preparar demo video corto y materiales de lanzamiento.
- [ ] Crear emails de lanzamiento y bienvenida en Resend.
- [ ] Hacer smoke E2E completo: signup → Holded → chat → resumen → alerta.
- [ ] Revisar copy y enlaces de los conectores Claude/ChatGPT hacia el hub.
- [ ] Confirmar DNS/SSL para `isaak.app` e `isaak.chat` en Vercel.
- [ ] Publicar la rama desde `deploy/origin-main-clean-2026-06-02` y monitorizar deployment.

## Infra crítica para V1

- [ ] Confirmar `prisma migrate deploy` en producción para plantillas, certificados y advisor clients.
- [ ] Validar WSDL AEAT con certificado real.
- [ ] Registrar redirect URI de Microsoft en Azure AD.
- [ ] Ejecutar QA manual OpenAI/Anthropic para conectores de adquisición.

## Nota de foco

Este plan es la hoja de ruta operativa para V1. Todo lo que no sea estrictamente necesario para el corte V1 debe quedar como roadmap V2+ y no bloquear el lanzamiento.
