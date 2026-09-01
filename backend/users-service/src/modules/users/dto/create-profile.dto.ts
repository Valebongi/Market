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

/** Estados válidos, espejo del enum `UserStatus` de Prisma. */
export const USER_STATUSES = ['active', 'suspended'] as const;

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

  /**
   * SOLO lo manda `PATCH /auth/users/:identifier/role` de auth-service, que es
   * el endpoint que escribe la FUENTE DE VERDAD del rol (`users.role`, el que
   * viaja en el JWT). Este flag replica esa decision al perfil que lista el
   * panel.
   *
   * Que hace: pisa `role` en la rama `update` del upsert, para cualquiera de
   * los tres roles. El comportamiento normal sigue siendo no pisarlo — el
   * `syncProfileToUsersService` que corre en cada login NO manda este flag, asi
   * que un login no revierte nada.
   *
   * Diferencia con `bootstrapAdmin`, que no es redundante: aquel ademas fuerza
   * `status=active` y levanta `deletedAt`, porque un primer admin invisible en
   * su propio panel no sirve para nada. Este toca UNICAMENTE `role`: cambiarle
   * el rol a alguien no es motivo para reactivarle una cuenta suspendida ni
   * para revivirle un perfil dado de baja.
   *
   * Por que viaja por aca y no por un endpoint nuevo: `POST /users/profiles` es
   * la unica llamada servicio-a-servicio del MVP. Reusarla evita un segundo
   * punto de acoplamiento y un segundo secreto que rotar.
   *
   * Cerrojo: igual que `bootstrapAdmin`, `UsersService.createProfile` lo
   * rechaza salvo que `INTERNAL_SERVICE_TOKEN` este configurado en ESTE
   * servicio — o sea, solo vale en el modo donde `x-internal-token` se verifica
   * de verdad, nunca en el modo backstop. Falla cerrado.
   */
  @IsOptional()
  @IsBoolean()
  forceRole?: boolean;

  /**
   * Estado de cuenta. Solo se escribe cuando viene acompanado de
   * `forceStatus`; sin ese flag se ignora, igual que `role` sin `forceRole` en
   * la rama `update`.
   *
   * Es opcional porque el llamador normal (`syncProfileToUsersService`, que
   * corre en cada registro y en cada login) NO manda estado: el estado del
   * perfil no es asunto de un login.
   */
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];

  /**
   * SOLO lo manda `PATCH /auth/users/:identifier/status` de auth-service, que
   * es el endpoint que escribe la FUENTE DE VERDAD del estado (`users.status`,
   * el que lee `login`). Este flag replica esa decision al perfil que lista y
   * filtra el panel.
   *
   * POR QUE EXISTE: `PATCH /users/:userId/status` escribia SOLO esta copia. El
   * login vive en auth-service y nunca la miraba, asi que suspender desde el
   * panel cambiaba el badge de la UI y nada mas: el suspendido seguia
   * logueandose con normalidad. Una medida de seguridad que no cortaba nada.
   *
   * Que hace: pisa `status` — en la rama `update` y tambien en la `create`,
   * porque un perfil que se materializa recien ahora tiene que nacer con el
   * estado que ya decidio auth-service, no con el `active` por defecto.
   *
   * Que NO hace: no toca `role`, ni `displayName`, ni `deletedAt`. Reactivar a
   * alguien no es revivir un perfil dado de baja — eso es otra operacion.
   *
   * Cerrojo: igual que `forceRole` y `bootstrapAdmin`, `UsersService.createProfile`
   * lo rechaza salvo que `INTERNAL_SERVICE_TOKEN` este configurado en ESTE
   * servicio — o sea, solo vale en el modo donde `x-internal-token` se verifica
   * de verdad, nunca en el modo backstop. Falla cerrado.
   */
  @IsOptional()
  @IsBoolean()
  forceStatus?: boolean;
}
