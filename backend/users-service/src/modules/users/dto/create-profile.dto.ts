import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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

  /**
   * SOLO lo manda el bootstrap del primer admin de auth-service
   * (`admin-bootstrap.service.ts`), y una unica vez en la vida de la
   * instalacion.
   *
   * Que hace: es el unico caso en que el upsert PISA `role` en la rama
   * `update`. El comportamiento normal es a la inversa — no pisar, porque el
   * rol del perfil lo pudo haber cambiado un admin desde el panel.
   *
   * Por que viaja por aca y no por un endpoint nuevo: `POST /users/profiles` es
   * la unica llamada servicio-a-servicio del MVP. Meter la promocion adentro
   * del contrato que ya existe evita abrir un segundo punto de acoplamiento (y
   * un segundo secreto que rotar).
   *
   * Cerrojo: `UsersService.createProfile` lo rechaza salvo que
   * `INTERNAL_SERVICE_TOKEN` este configurado en ESTE servicio — o sea, solo
   * vale en el modo donde el header `x-internal-token` se verifica de verdad,
   * nunca en el modo backstop. Falla cerrado.
   */
  @IsOptional()
  @IsBoolean()
  bootstrapAdmin?: boolean;
}
