-- AlterTable
-- Agrega las columnas "resettoken" y "resettokenexpiry" a la tabla "users".
--
-- Estos campos ya existian en schema.prisma (User.resetToken / User.resetTokenExpiry,
-- mapeados con @map a nombres en minuscula y sin guiones bajos) y en las bases de
-- desarrollo, pero nunca formaron parte de una migracion: se habian aplicado a mano.
-- Una base creada desde cero con `prisma migrate deploy` (el caso de produccion en
-- Railway, donde el CMD del Dockerfile corre migrate deploy al arrancar) nacia sin
-- ellas. Como Prisma incluye todos los campos escalares en cada SELECT, cualquier
-- findUnique/findFirst/findMany sobre User fallaba: login y registro caidos.
--
-- Los nombres son EXACTAMENTE los que declara el @map del schema (todo minuscula,
-- sin guiones bajos). Si no coinciden caracter por caracter, Prisma no los encuentra.
--
-- Se usa IF NOT EXISTS para que la migracion sea idempotente y corra limpia tanto
-- contra una base nueva como contra las bases existentes que ya tienen las columnas.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resettoken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resettokenexpiry" TIMESTAMP(3);

-- AlterTable
-- Normalizacion de tipo (solo aplica a bases preexistentes).
--
-- En las bases donde la columna se agrego a mano quedo como "timestamp with time zone"
-- (timestamptz), mientras que el schema declara DateTime sin @db.Timestamptz, o sea
-- "timestamp(3) without time zone". En una base nueva el ADD COLUMN de arriba ya crea
-- el tipo correcto y este bloque es un no-op; en las preexistentes corrige la deriva
-- para que `prisma migrate diff --from-url` de vacio contra cualquiera de las dos.
--
-- El USING ... AT TIME ZONE 'UTC' hace la conversion determinista e independiente del
-- TimeZone de la sesion: Prisma interpreta las columnas `timestamp` como UTC.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'users'
      AND column_name = 'resettokenexpiry'
      AND data_type <> 'timestamp without time zone'
  ) THEN
    ALTER TABLE "users"
      ALTER COLUMN "resettokenexpiry" TYPE TIMESTAMP(3)
      USING "resettokenexpiry" AT TIME ZONE 'UTC';
  END IF;
END
$$;
