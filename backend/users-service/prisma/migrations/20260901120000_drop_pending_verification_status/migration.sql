-- Retira el valor 'pending_verification' del enum "UserStatus".
--
-- Por que: el MVP no verifica email. Ningun codigo escribia ese estado
-- (UpdateStatusDto solo acepta active|suspended, el default es active) ni lo
-- leia. Era un resto de un diseno anterior.
--
-- Postgres no permite quitar valores de un enum, asi que se recrea el tipo.
--
-- IDEMPOTENTE: si el valor ya no existe, el bloque no hace nada. Se puede
-- reaplicar sobre una base ya migrada sin efecto.
--
-- FALLA CERRADO: si alguna fila quedara en 'pending_verification', se aborta con
-- un mensaje explicito en vez de convertirla en silencio a otro estado. En ese
-- caso hay que decidir a mano a que estado va cada fila y volver a correr.
DO $$
DECLARE
  filas_afectadas bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema()
      AND t.typname = 'UserStatus'
      AND e.enumlabel = 'pending_verification'
  ) THEN
    RAISE NOTICE 'UserStatus ya no tiene pending_verification; nada que hacer.';
    RETURN;
  END IF;

  EXECUTE 'SELECT count(*) FROM "user_profiles" WHERE "status"::text = ''pending_verification'''
    INTO filas_afectadas;

  IF filas_afectadas > 0 THEN
    RAISE EXCEPTION
      'Hay % perfil(es) con status=pending_verification. Reasignalos a active o suspended antes de aplicar esta migracion.',
      filas_afectadas;
  END IF;

  EXECUTE 'ALTER TYPE "UserStatus" RENAME TO "UserStatus_old"';
  EXECUTE 'CREATE TYPE "UserStatus" AS ENUM (''active'', ''suspended'')';
  EXECUTE 'ALTER TABLE "user_profiles" ALTER COLUMN "status" DROP DEFAULT';
  EXECUTE 'ALTER TABLE "user_profiles" ALTER COLUMN "status" TYPE "UserStatus" USING ("status"::text::"UserStatus")';
  EXECUTE 'ALTER TABLE "user_profiles" ALTER COLUMN "status" SET DEFAULT ''active''';
  EXECUTE 'DROP TYPE "UserStatus_old"';
END
$$;
