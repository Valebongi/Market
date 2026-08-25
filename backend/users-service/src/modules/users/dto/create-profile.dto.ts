import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Roles válidos, espejo del enum `UserRole` de Prisma. */
export const USER_ROLES = ['admin', 'asset_owner', 'entrepreneur'] as const;

/**
 * Body de `POST /users/profiles`, el único endpoint servicio-a-servicio del
 * sistema (lo llama auth-service al registrar/loguear). Antes no tenía DTO:
 * `role` entraba como `string` y se casteaba con `as any` contra un enum de
 * Prisma, así que un valor inválido reventaba en 500 en vez de 400 — y nada
 * impedía crear un perfil con role `admin`.
 */
export class CreateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName: string;

  @IsIn(USER_ROLES)
  role: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
