import { IsOptional, IsEnum, IsString, IsNumber, Min, Max, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAssetsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['software', 'design', 'business_model', 'content', 'brand', 'project', 'other'])
  category?: string;

  @IsOptional()
  @IsEnum(['exclusive', 'non_exclusive', 'temporary'])
  licenseType?: string;

  @IsOptional()
  @IsEnum(['fixed', 'negotiable', 'free'])
  pricingType?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'flagged', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  /**
   * Whitelist explicita: `sortBy` se interpola directo en el `orderBy` de Prisma
   * (`orderBy: { [sortBy]: sortOrder }`). Sin esto, cualquier string que no sea un
   * campo escalar de Asset hace que Prisma tire y el endpoint publico responda 500
   * en vez de 400. Solo se exponen los campos por los que el frontend ordena hoy.
   */
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'requestCount', 'price', 'title'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /**
   * Tope duro. `limit` va directo al `take` de Prisma: sin `@Max`, un
   * `GET /assets?limit=999999` anonimo (la ruta no pasa por auth en el gateway)
   * baja la tabla entera con sus tags y links. 100 es el maximo que usa el
   * frontend hoy (dashboard de activos del titular).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
