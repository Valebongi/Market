import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetDto {
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  description: string;

  @IsEnum(['software', 'design', 'business_model', 'content', 'other'])
  category: string;

  @IsEnum(['exclusive', 'non_exclusive', 'temporary'])
  licenseType: string;

  @IsEnum(['fixed', 'negotiable', 'free'])
  pricingType: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  territory?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  links?: { label: string; url: string; isMain?: boolean }[];

  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}
