-- F11 Inspector AEAT preventivo (Capa 1) — métricas por mensaje.
--
-- inspector_runs: número de tools de escritura sobre los que corrió el
--   Inspector en este turno (las read-tools se saltan, igual que el judge)
-- inspector_blocks: número de tools bloqueadas por errores del Inspector
-- inspector_warnings: total de violaciones-warning observadas (puede ser
--   >0 incluso si inspector_blocks=0; warnings no bloquean pero quedan
--   registradas para análisis de error fiscal típico por tenant)

ALTER TABLE "isaak_chat_metrics"
  ADD COLUMN IF NOT EXISTS "inspector_runs"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "inspector_blocks"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "inspector_warnings" INTEGER NOT NULL DEFAULT 0;
