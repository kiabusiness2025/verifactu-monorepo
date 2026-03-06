# Alta de Empresa Asistida por Documentos (Fase 1)

Fecha: 2026-03-06

## Objetivo
Unificar el alta de empresa en un solo flujo (`Añadir empresa`) y permitir al usuario adjuntar documentación (escrituras, tarjeta CIF/NIF, declaraciones, etc.) desde onboarding para asistencia con Isaak.

## Alcance Fase 1
- Flujo único de entrada: `/dashboard/onboarding?next=/dashboard`.
- Carga de documentación en onboarding.
- Persistencia de metadatos de documentos dentro del payload `extra.raw` al crear tenant.
- Botón de acceso a flujo asistido de Isaak (`/dashboard/isaak?intent=company_onboarding&mode=assisted_upload`).

## Decisión de Storage
- Primario: storage propio de la plataforma (actualmente endpoint de upload de app).
- Google Drive Workspace: opcional como conector de ingestión en fases posteriores.
- Regla: Drive no debe ser fuente de verdad del documento empresarial.

## Campos de documento (Fase 1)
Metadatos guardados en `extra.raw.onboardingDocuments[]`:
- `id`
- `type` (`deed | cif_card | tax_return | other`)
- `name`
- `url`
- `size`
- `contentType`
- `uploadedAt`

Además se añade:
- `extra.raw.intakeSource = "document_assisted" | "manual"`

## Archivos afectados
- `apps/app/app/dashboard/onboarding/page.tsx`
- `apps/app/components/layout/Topbar.tsx`
- `apps/app/app/api/onboarding/status/route.ts`
- `apps/app/app/api/onboarding/tenant/route.ts`
- `apps/app/components/tenants/CreateCompanyModal.tsx`

## Siguientes fases
- Fase 2: modelo dedicado de `CompanyDocument` + versiones + estado de validación.
- Fase 3: pipeline OCR/extracción (Isaak) y confirmación guiada de campos fiscales.
- Fase 4: conector de importación desde Drive (sin cambiar source of truth).
