-- C-B1.c fix R4 — añadir status intermedio 'submitting' al audit log.
--
-- Motivo: el worker (aeat-browser/submission-worker.ts) necesita un
-- lock real para evitar doble-procesado cuando dos instancias compiten
-- por la misma submission. Antes el lock era cosmético (solo refrescaba
-- updatedAt), ahora cambia status a 'submitting' como guarda.
--
-- Status flow:
--   pending_aeat → submitting → submitted/accepted/rejected/error/cancelled
--
-- 'submitting' = "worker procesándola activamente". Si un worker crashea,
-- queda en este status; el siguiente batch lo recupera vía sweep de
-- entradas con updatedAt > N min (lógica en código, no en DB).

ALTER TABLE "isaak_aeat_submissions"
  DROP CONSTRAINT "isaak_aeat_submissions_status_check";

ALTER TABLE "isaak_aeat_submissions"
  ADD CONSTRAINT "isaak_aeat_submissions_status_check"
  CHECK ("status" IN ('pending_aeat', 'submitting', 'submitted', 'accepted', 'rejected', 'error', 'cancelled'));
