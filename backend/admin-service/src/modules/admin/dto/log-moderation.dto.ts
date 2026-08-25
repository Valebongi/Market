import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Los cuatro valores son los del enum Postgres `ModerationAction`. Validarlos
 * acá es lo que convierte un input basura en 400 en vez de 500: sin DTO, el
 * ValidationPipe global no valida nada (un `@Body()` tipado con un object
 * literal no tiene metatype de clase, así que `whitelist`/`forbidNonWhitelisted`
 * no se aplican) y el string viajaba crudo hasta Postgres, que lo rechazaba:
 *
 *   POST /admin/moderation/log {"action":"banana"}  -> HTTP 500
 *   POST /admin/moderation/log {}                   -> HTTP 500
 */
export class LogModerationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  assetId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  assetTitle: string;

  // @IsIn y no @IsEnum: con un array literal, @IsEnum genera el mensaje
  // "action must be one of the following values: " (vacio, sin los valores).
  @IsIn(['approved', 'rejected', 'flagged', 'restored'])
  action: 'approved' | 'rejected' | 'flagged' | 'restored';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
