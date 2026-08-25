import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Sin DTO, `{"totalUsers":"muchos"}` llegaba como string hasta Prisma y
 * devolvía HTTP 500. Los siete contadores son enteros no negativos.
 */
export class RecordSnapshotDto {
  @Type(() => Number) @IsInt() @Min(0) totalUsers: number;
  @Type(() => Number) @IsInt() @Min(0) newUsers: number;
  @Type(() => Number) @IsInt() @Min(0) totalAssets: number;
  @Type(() => Number) @IsInt() @Min(0) publishedAssets: number;
  @Type(() => Number) @IsInt() @Min(0) totalRequests: number;
  @Type(() => Number) @IsInt() @Min(0) closedRequests: number;
  @Type(() => Number) @IsInt() @Min(0) totalViews: number;
}
