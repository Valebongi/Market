import { IsIn } from 'class-validator';

/**
 * Roles asignables por un admin. Espejo del comentario de `User.role` en
 * `schema.prisma` (la columna es `String`, no un enum de Postgres, así que la
 * validación de valores vive acá y en ningún otro lado).
 *
 * A diferencia de `RegisterDto.UserRole` —que a propósito NO incluye `admin`,
 * porque el registro está abierto a internet y aceptarlo sería auto-promoción—
 * acá `admin` sí es asignable: este endpoint ya exige ser admin para llegar.
 */
export const ASSIGNABLE_ROLES = ['admin', 'asset_owner', 'entrepreneur'] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Body de `PATCH /auth/users/:identifier/role`. */
export class AdminUpdateRoleDto {
  @IsIn(ASSIGNABLE_ROLES)
  role: AssignableRole;
}
