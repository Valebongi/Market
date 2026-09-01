import { IsIn } from 'class-validator';

/**
 * Estados de cuenta asignables por un admin. Espejo del comentario de
 * `User.status` en `schema.prisma` (la columna es `String`, no un enum de
 * Postgres, asi que la validacion de valores vive aca y en ningun otro lado) y
 * del enum `UserStatus` de users-service.
 *
 * Son los dos unicos estados del MVP. `pending_verification` se retiro de
 * users-service porque no hay verificacion de email; no lo reintroduzcas aca.
 */
export const ASSIGNABLE_STATUSES = ['active', 'suspended'] as const;

export type AssignableStatus = (typeof ASSIGNABLE_STATUSES)[number];

/**
 * Body de `PATCH /auth/users/:identifier/status`.
 *
 * Suspender y reactivar son EL MISMO endpoint, no dos. Razones:
 *
 * 1. Es una transicion de un campo con dos valores, no dos acciones distintas.
 *    Dos endpoints (`/suspend` y `/reactivate`) obligan a duplicar las mismas
 *    cuatro guardas (admin, identidad del solicitante, cuenta dada de baja,
 *    auto-operacion) y garantizan que en algun momento diverjan.
 * 2. El panel ya tiene un toggle, no dos botones: manda el estado destino.
 * 3. Queda como hermano exacto de `PATCH /auth/users/:identifier/role`, que
 *    tampoco tiene un endpoint por rol. Dos endpoints hermanos con la misma
 *    forma es lo que evita que el panel termine con dos criterios.
 *
 * El precio es que reactivar y suspender comparten autorizacion (ambas
 * admin-only), que es exactamente lo que se quiere: reactivar una cuenta
 * suspendida por fraude no es una operacion menos sensible que suspenderla.
 */
export class AdminUpdateStatusDto {
  @IsIn(ASSIGNABLE_STATUSES)
  status: AssignableStatus;
}
