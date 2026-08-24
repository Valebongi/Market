-- AlterEnum
-- Agrega las categorias "brand" (Marca y Branding) y "project" (Proyecto) al enum AssetType.
--
-- Nota PostgreSQL: ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de un bloque
-- transaccional en PG < 12. Desde PG 12 si es posible, siempre que el nuevo valor no
-- se utilice en la misma transaccion (aca no se usa). El entorno objetivo es PG 18.
-- Se usa IF NOT EXISTS para que la migracion sea idempotente frente a bases donde el
-- valor ya haya sido agregado a mano.
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'brand' AFTER 'content';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'project' AFTER 'brand';
