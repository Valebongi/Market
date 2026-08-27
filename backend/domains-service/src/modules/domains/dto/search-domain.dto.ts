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
 *
 * OJO: `@ArrayMaxSize(10)` ya NO es la única defensa contra el fan-out. Desde
 * que la búsqueda genera sugerencias, el tope real lo ponen `RDAP_MAX_LOOKUPS`
 * y la cola de `RDAP_CONCURRENCY` en `rdap.ts`: acá se acota cuántas
 * extensiones puede pedir el cliente, allá cuántas consultas salen y de a
 * cuántas por vez. Las dos cosas tienen que seguir siendo verdad.
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
  // Flag `i`: los TLDs son case-insensitive por DNS, así que `.COM` es tan
  // válido como `.com`. Sin el flag, un cliente que mandara `.COM` se comía un
  // 400 por un TLD perfectamente real, y el `.toLowerCase()` de
  // `normalizeExtensions` no llegaba a correr nunca porque la validación
  // rechaza antes. Normalizar a minúsculas queda del lado del service.
  @Matches(/^\.[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i, {
    each: true,
    message: 'each extension must look like ".com" or ".co.uk"',
  })
  extensions?: string[];
}
