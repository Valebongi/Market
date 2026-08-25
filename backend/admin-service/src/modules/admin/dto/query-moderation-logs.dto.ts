import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * `page` y `limit` NO pueden declararse como `@Query('page') page?: number`.
 *
 * Con `transform: true`, para un parámetro primitivo suelto el ValidationPipe
 * ejecuta `transformPrimitive`, que para `metatype === Number` hace `+value`
 * sin chequear si el valor vino. Con el query param ausente eso es
 * `+undefined === NaN`, y NaN no es `undefined`, así que el default del
 * parámetro (`limit = 20`) NUNCA se aplica. Verificado contra Postgres real:
 *
 *   GET /api/v1/admin/moderation/logs        (sin page ni limit)
 *   -> PrismaClientValidationError: skip: NaN / Argument `take` is missing
 *   -> HTTP 500
 *
 *   GET /api/v1/admin/moderation/logs?page=1&limit=20  -> HTTP 200
 *
 * Es decir: la llamada por defecto —la que hace cualquier cliente que no pasa
 * paginación— rompía siempre. Envuelto en una clase DTO el pipe toma el camino
 * de validación de objetos: una clave ausente queda `undefined`, `@IsOptional()`
 * la deja pasar y recién ahí aplica el default del service.
 */
export class QueryModerationLogsDto {
  @IsOptional() @IsString() assetId?: string;
  @IsOptional() @IsString() adminId?: string;

  @IsOptional()
  @IsIn(['approved', 'rejected', 'flagged', 'restored'])
  action?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
