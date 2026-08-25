-- CreateIndex
-- Indices de lectura para assets-service.
--
-- Hasta esta migracion la unica entrada indexada de "assets" era la PK y el
-- UNIQUE de "slug". Todo lo demas iba a seq scan:
--
--   * GET /assets  filtra SIEMPRE por deleted_at IS NULL + status y ordena por
--     created_at. Es la query mas caliente del producto (home, marketplace,
--     explorar, landing) y la unica que ve trafico anonimo.
--   * El dashboard del titular hace tres listados por (owner_id, status).
--   * El filtro de categoria del marketplace pega contra "category".
--   * Postgres NO indexa automaticamente las columnas de clave foranea. Sin
--     indice en asset_tags/asset_links/asset_attachments/asset_flags.asset_id,
--     cada `include` del detalle y cada DELETE en cascada recorre la tabla hija
--     entera.
--
-- IF NOT EXISTS en todos: la migracion es idempotente y se puede aplicar sobre
-- bases donde los indices ya se hayan creado a mano.
--
-- Se usa CREATE INDEX plano (no CONCURRENTLY) a proposito: `prisma migrate
-- deploy` corre cada migracion dentro de una transaccion y CONCURRENTLY no es
-- transaccionable. Toma un ACCESS EXCLUSIVE lock breve sobre cada tabla; con el
-- volumen actual del MVP son milisegundos. Si estas tablas crecieran a millones
-- de filas, crear estos indices a mano con CONCURRENTLY antes del deploy.

CREATE INDEX IF NOT EXISTS "assets_status_deleted_at_created_at_idx" ON "assets"("status", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "assets_owner_id_status_idx" ON "assets"("owner_id", "status");

CREATE INDEX IF NOT EXISTS "assets_category_idx" ON "assets"("category");

CREATE INDEX IF NOT EXISTS "asset_tags_asset_id_idx" ON "asset_tags"("asset_id");

CREATE INDEX IF NOT EXISTS "asset_attachments_asset_id_idx" ON "asset_attachments"("asset_id");

CREATE INDEX IF NOT EXISTS "asset_links_asset_id_idx" ON "asset_links"("asset_id");

CREATE INDEX IF NOT EXISTS "asset_flags_asset_id_resolved_idx" ON "asset_flags"("asset_id", "resolved");
