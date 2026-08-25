-- CreateTable
-- Marca de ejecucion del bootstrap del primer admin (ver AdminBootstrap en
-- schema.prisma). Una sola fila como maximo en toda la vida de la instalacion.
--
-- IF NOT EXISTS por consistencia con el resto de las migraciones de este
-- servicio: la base de produccion se creo a mano en parte, y una migracion que
-- revienta al aplicarse deja el servicio sin arrancar (el CMD del Dockerfile
-- corre `migrate deploy` antes de `node dist/main`).
CREATE TABLE IF NOT EXISTS "admin_bootstraps" (
    "id" TEXT NOT NULL,
    "lock" INTEGER NOT NULL DEFAULT 1,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "outcome" TEXT NOT NULL,
    "userCreated" BOOLEAN NOT NULL DEFAULT false,
    "profileSyncedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_bootstraps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- ESTE indice es el mecanismo de un-solo-uso. La columna "lock" vale siempre 1,
-- asi que el unique admite exactamente una fila: el segundo INSERT falla con
-- P2002 en vez de ejecutar un segundo bootstrap. Es lo que hace la operacion
-- idempotente incluso con dos instancias arrancando en paralelo.
CREATE UNIQUE INDEX IF NOT EXISTS "admin_bootstraps_lock_key" ON "admin_bootstraps"("lock");
