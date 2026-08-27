-- Atribucion de los snapshots de metricas + indices de la tabla de auditoria.
--
-- IDEMPOTENTE: todo con IF NOT EXISTS. La migracion corre sobre una base de
-- produccion que ya tiene filas, y tiene que poder re-aplicarse sin romper.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Quien escribio cada snapshot, y cuando fue la ultima vez.
--
-- `recorded_by` queda NULLABLE y SIN default: las filas que ya existen no
-- tienen autor conocido, y rellenarlas con un valor inventado seria justamente
-- el problema que la columna viene a resolver. NULL = "escrita antes de que
-- hubiera atribucion".
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "metric_snapshots" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;

-- `updated_at` SI necesita default para las filas existentes: se usa
-- `created_at` como mejor aproximacion verdadera de cuando se escribio esa
-- fila por ultima vez, en vez de estampar todo con `now()`, que afirmaria que
-- los snapshots viejos se tocaron hoy.
ALTER TABLE "metric_snapshots"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "metric_snapshots"
   SET "updated_at" = "created_at"
 WHERE "updated_at" > "created_at";

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indices de la tabla de auditoria.
--
-- `moderation_logs` se consulta siempre filtrada (asset_id / admin_id / action)
-- y ordenada por created_at, y no tenia un solo indice: cada consulta era un
-- scan completo. La auditoria tiene que responder justo cuando alguien la esta
-- atacando.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "moderation_logs_created_at_idx" ON "moderation_logs"("created_at");
CREATE INDEX IF NOT EXISTS "moderation_logs_asset_id_idx"   ON "moderation_logs"("asset_id");
CREATE INDEX IF NOT EXISTS "moderation_logs_admin_id_idx"   ON "moderation_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "moderation_logs_action_idx"     ON "moderation_logs"("action");
