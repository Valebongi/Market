import { IsString, MinLength, MaxLength, IsOptional, IsArray } from 'class-validator';

export class SearchDomainDto {
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  query: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extensions?: string[];
}
