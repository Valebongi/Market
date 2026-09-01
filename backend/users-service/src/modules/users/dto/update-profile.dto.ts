import { IsString, IsOptional, MaxLength, IsEnum, IsEmail, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  github?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  emailMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  emailMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDigest?: boolean;

  @IsOptional()
  @IsBoolean()
  emailSecurity?: boolean;
}

/**
 * Body de `PATCH /users/:userId/status`.
 *
 * Tenia un campo `reason` opcional que se validaba y despues se descartaba:
 * `UsersService.updateStatus` solo lee `status`, y no hay columna donde
 * guardar un motivo de suspension. Ningun cliente lo mandaba. Un campo que se
 * acepta y se tira es peor que no tenerlo — hace creer que el motivo queda
 * registrado en algun lado. Si algun dia hace falta auditar suspensiones, entra
 * junto con la columna que lo persista.
 */
export class UpdateStatusDto {
  @IsEnum(['active', 'suspended'])
  status: string;
}
