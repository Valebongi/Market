import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body de `POST /auth/oauth/callback`.
 *
 * OJO: este endpoint está excluido del middleware de auth del gateway, así que
 * este DTO es la ÚNICA barrera de entrada. Valida la FORMA del payload, no su
 * AUTENTICIDAD: quien pueda llegar al endpoint sigue pudiendo afirmar cualquier
 * identidad. Ver el reporte de auditoría (hallazgo A-1) para el fix real.
 */
export class OAuthCallbackDto {
  @IsIn(['google', 'github'])
  provider: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  providerId: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}
