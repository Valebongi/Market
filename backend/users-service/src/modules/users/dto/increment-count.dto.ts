import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Body de `PATCH /users/:userId/{asset-count,license-count}`. */
export class IncrementCountDto {
  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  delta?: number;
}
