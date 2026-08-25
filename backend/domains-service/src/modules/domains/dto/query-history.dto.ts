import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * `limit` NO puede declararse como `@Query('limit') limit?: number`.
 *
 * Con `transform: true`, para un primitivo suelto el ValidationPipe corre
 * `transformPrimitive`, que con `metatype === Number` hace `+value` sin mirar
 * si el valor vino: `+undefined === NaN`. Y como NaN no es `undefined`, el
 * default del parámetro (`limit = 10`) nunca se aplicaba. Verificado contra
 * Postgres real:
 *
 *   GET /api/v1/domains/history            -> HTTP 500
 *     PrismaClientValidationError: Argument `take` is missing (take: NaN)
 *   GET /api/v1/domains/history?limit=10   -> HTTP 200
 *
 * El frontend llama SIN query params (`services/domains.service.ts`), o sea
 * que el endpoint fallaba en el 100% de las llamadas reales. Dentro de una
 * clase DTO el pipe valida el objeto: la clave ausente queda `undefined` y el
 * default del service recién ahí toma efecto.
 */
export class QueryHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
