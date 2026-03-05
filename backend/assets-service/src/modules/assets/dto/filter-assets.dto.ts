import { IsOptional, IsEnum, IsString, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAssetsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['software', 'design', 'business_model', 'content', 'other'])
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

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
