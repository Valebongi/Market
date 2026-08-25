import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * `extensions` se interpola CRUDO dentro de la URL de RDAP
 * (`https://rdap.org/domain/${baseName}${ext}`). Sin validación de formato, el
 * cliente controlaba el path de una request saliente del servidor. Verificado:
 *
 *   POST /domains/search {"query":"test","extensions":["/../../ip"]}
 *   -> el servicio pidió https://rdap.org/domain/test/../../ip
 *
 * Y sin tope de cantidad, un solo request podía disparar N llamadas salientes
 * en paralelo (probado con 40) — vía directa a que rdap.org nos rate-limitee.
 *
 * `@Matches` acepta solo TLDs reales: punto inicial, letras/dígitos/guiones,
 * con soporte de multi-nivel (`.co.uk`). `@ArrayMaxSize(10)` acota el fan-out.
 */
export class SearchDomainDto {
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  query: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\.[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, {
    each: true,
    message: 'each extension must look like ".com" or ".co.uk"',
  })
  extensions?: string[];
}
