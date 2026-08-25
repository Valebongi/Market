import { IsIn, IsOptional } from 'class-validator';

/**
 * `range` venía tipado como unión de TypeScript, que en runtime no existe.
 * `?range=xxx` hacía `days === undefined` -> `setDate(getDate() - undefined)`
 * -> Invalid Date -> Prisma 500. Verificado: HTTP 500 antes de este DTO.
 */
export class QueryMetricsDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '365d'])
  range?: '7d' | '30d' | '90d' | '365d';
}
