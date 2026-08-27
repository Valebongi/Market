-- Indice del historial de busquedas.
--
-- IDEMPOTENTE: IF NOT EXISTS. Corre sobre una base de produccion con filas.
--
-- `domain_searches` se consulta siempre como "las N mas recientes de ESTE
-- usuario" (`getHistory`, y ahora tambien `pruneHistory`, que recorta el
-- historial a las 100 ultimas). Sin indice eso era un scan completo de una
-- tabla que hasta ahora crecia sin techo: una fila por busqueda, para siempre,
-- inflable a voluntad por cualquier usuario automatizado.
CREATE INDEX IF NOT EXISTS "domain_searches_user_id_created_at_idx"
  ON "domain_searches"("user_id", "created_at");
