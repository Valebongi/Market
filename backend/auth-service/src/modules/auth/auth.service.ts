import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AssignableRole } from './dto/update-role.dto';

/**
 * Hash bcrypt (coste 12) de un valor arbitrario, contra el que se compara
 * cuando la cuenta NO existe o no tiene passwordHash (cuentas solo-OAuth).
 *
 * Sin esto, `login` era un oráculo de enumeración por tiempo: un email
 * inexistente cortaba en el `findUnique` y respondía en ~5 ms, mientras que uno
 * REAL disparaba `bcrypt.compare` (~340 ms con coste 12). Esa diferencia de ~60x
 * revela qué emails están registrados aunque el mensaje de error sea idéntico.
 * Comparar siempre contra un hash del mismo coste iguala el tiempo de respuesta.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$jOzfrP4fYcV7Z13c5wrUb.wQJ2Thmg7MhvsTh151DwEBAJ9jd3rce';

/** UUID v4 canonico. Se valida ANTES de tocar Prisma: pasarle un string suelto
 *  a una columna uuid revienta en 500 en vez de en 400. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resultado de replicar el rol al perfil de users-service.
 *   ok               -> el perfil del panel quedo alineado con auth-service.
 *   failed           -> users-service rechazo o no respondio. El rol en
 *                       auth-service (la fuente de verdad) YA quedo aplicado.
 *   skipped_no_token -> falta INTERNAL_SERVICE_TOKEN en auth-service, asi que
 *                       ni se intento. Tambien deja el rol aplicado.
 */
export type ProfileSyncOutcome = 'ok' | 'failed' | 'skipped_no_token';

@Injectable()
export class AuthService {
  /** Contexto propio para que el rastro de auditoria de roles sea grepeable. */
  private readonly logger = new Logger('auth:admin-role');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Incluye cuentas con `deletedAt`: el email de una cuenta borrada queda
    // reservado a propósito. Reciclarlo permitiría heredar la identidad de un
    // usuario dado de baja (menciones, hilos, referencias por email).
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        status: 'active',
        profile: {
          create: {
            displayName: dto.name,
            contactEmail: dto.email,
          },
        },
      },
      include: { profile: true },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    // Sync to users-service (fire-and-forget)
    this.syncProfileToUsersService(user.id, dto.name, dto.role, dto.email);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    // Se corre bcrypt SIEMPRE, antes de cualquier rama, para que el tiempo de
    // respuesta no dependa de si la cuenta existe. Contra un usuario real se
    // compara su hash; contra uno inexistente o solo-OAuth, contra el hash
    // señuelo (mismo coste). Así se cierra la enumeración por tiempo: todas las
    // credenciales inválidas tardan lo mismo, exista o no el email.
    const passwordMatch = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    // `deletedAt` se trata igual que "no existe": mismo mensaje y mismo código,
    // para no revelar que la cuenta existió. Hasta este fix el campo no se leía
    // en ningún lado, así que un usuario borrado seguía logueándose normal.
    if (!user || !user.passwordHash || user.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Cuenta suspendida. Contacta al soporte.');
    }

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    // Sync to users-service on login in case profile was never synced (legacy accounts)
    if (user.profile) {
      this.syncProfileToUsersService(user.id, user.profile.displayName, user.role, user.email);
    }

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { profile: true },
      });

      // Cortar acá es lo que hace efectivo el borrado sobre los tokens YA
      // emitidos: el gateway valida la firma por su cuenta, pero todo servicio
      // que pase por `/auth/validate` deja de ver al usuario de inmediato en vez
      // de esperar a que expire el JWT (7 días por defecto).
      if (!user || user.deletedAt || user.status === 'suspended') {
        throw new UnauthorizedException('Token inválido');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Alta o login por OAuth. La identidad que entra acá YA fue verificada
   * criptográficamente por `GoogleIdTokenService` a partir del ID token: no es
   * input del cliente. Ver `oauth/google-id-token.service.ts`.
   *
   * LINKEO POR EMAIL: si ya existe una cuenta con ese email (registrada con
   * contraseña, por ejemplo), se le vincula el provider en vez de crear una
   * segunda cuenta. Eso es correcto SOLO porque el verificador exige
   * `email_verified`: sin ese chequeo, cualquiera que pudiera declarar el email
   * de otro heredaría su cuenta por esta rama.
   */
  async oauthLogin(provider: string, providerId: string, email: string, name: string) {
    // Find or create user via OAuth
    let user = await this.prisma.user.findFirst({
      where: { oauthProvider: provider, oauthProviderId: providerId },
      include: { profile: true },
    });

    // Una cuenta borrada no puede volver por la puerta de OAuth.
    if (user?.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user) {
      // Check if email already exists
      const emailUser = await this.prisma.user.findUnique({ where: { email } });
      if (emailUser?.deletedAt) {
        // Ni vincular un provider nuevo a una cuenta dada de baja: sería
        // resucitarla con credenciales distintas.
        throw new UnauthorizedException('Credenciales inválidas');
      }
      if (emailUser) {
        // Link OAuth to existing account
        user = await this.prisma.user.update({
          where: { id: emailUser.id },
          data: { oauthProvider: provider, oauthProviderId: providerId },
          include: { profile: true },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email,
            oauthProvider: provider,
            oauthProviderId: providerId,
            role: 'entrepreneur', // default role, can be changed
            status: 'active',
            profile: {
              create: {
                displayName: name,
                contactEmail: email,
              },
            },
          },
          include: { profile: true },
        });
      }
    }

    // `login` cortaba a las cuentas suspendidas y esta rama no: una cuenta
    // suspendida seguía entrando por la puerta de OAuth. Mismo mensaje que
    // `login` para que la suspensión se comporte igual por los dos caminos.
    if (user.status === 'suspended') {
      throw new UnauthorizedException('Cuenta suspendida. Contacta al soporte.');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    // Sync to users-service (fire-and-forget)
    if (user.profile) {
      this.syncProfileToUsersService(user.id, user.profile.displayName, user.role, user.email);
    }

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash || user.deletedAt) {
      return { message: 'Si el email está registrado, recibirás las instrucciones.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // TODO: enviar el email de recuperación. Hasta entonces el token solo se
    // devuelve en el body cuando está EXPLÍCITAMENTE habilitado.
    //
    // Antes la condición era `NODE_ENV !== 'production'`, o sea fail-OPEN: en
    // cualquier entorno donde NODE_ENV no estuviera seteado (Railway incluido si
    // nadie la define) el endpoint entregaba un token de reseteo válido a
    // cualquiera que conociera un email registrado = toma de cuenta directa.
    // Ahora hay que optar por exponerlo, y por defecto no se expone.
    const exposeResetToken =
      this.config.get('EXPOSE_RESET_TOKEN') === 'true' ||
      this.config.get('NODE_ENV') === 'development';

    return {
      message: 'Si el email está registrado, recibirás las instrucciones.',
      ...(exposeResetToken && { devToken: token }),
    } as { message: string };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Baja administrativa de una cuenta. Soft delete: marca `deletedAt` y quema
   * el token de reseteo pendiente; no borra la fila ni el hash, así que es
   * reversible por SQL si hace falta.
   *
   * Acepta el UUID o el email como identificador porque auth-service no expone
   * listado: sin esto, borrar una cuenta conocida solo por su email obligaba a
   * ir a la base a buscar el id.
   *
   * ALCANCE: solo borra del lado de auth (login/token). El perfil vive en
   * users-service y se da de baja con `DELETE /api/v1/users/:userId`. NO se
   * encadena desde acá: sería una segunda llamada servicio-a-servicio y el MVP
   * tiene exactamente una. El panel de admin llama a los dos endpoints.
   */
  async adminSoftDelete(identifier: string, requesterRole?: string, requesterId?: string) {
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Se requiere rol admin');
    }

    const isEmail = identifier.includes('@');
    const isUuid = UUID_RE.test(identifier);

    // Un identificador que no es ni uno ni otro se corta acá: pasarlo a Prisma
    // como `id` contra una columna uuid revienta en 500 en vez de en 400.
    if (!isEmail && !isUuid) {
      throw new BadRequestException('Identificador inválido: se espera un userId (uuid) o un email');
    }

    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { id: identifier },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Un admin borrándose a sí mismo se queda sin poder entrar a deshacerlo, y
    // si es el último admin la instalación queda sin panel.
    if (requesterId && user.id === requesterId) {
      throw new BadRequestException('No podés dar de baja tu propia cuenta de admin');
    }

    if (user.deletedAt) {
      return {
        id: user.id,
        email: user.email,
        deletedAt: user.deletedAt,
        alreadyDeleted: true,
      };
    }

    const deleted = await this.prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), resetToken: null, resetTokenExpiry: null },
    });

    return {
      id: deleted.id,
      email: deleted.email,
      deletedAt: deleted.deletedAt,
      alreadyDeleted: false,
    };
  }

  /**
   * Cambio de rol administrativo. ESTE es el rol que manda.
   *
   * POR QUE EXISTE
   * `role` vive en dos lados: `users.role` (aca) y `user_profiles.role`
   * (users-service). El que decide la autorizacion real es este: auth-service
   * firma el JWT con el rol y el gateway autoriza mirando ese claim. El de
   * users-service es el que muestra el listado del panel.
   * `PATCH /api/v1/users/:userId/role` escribe SOLO la copia de users-service,
   * asi que hasta hoy era cosmetico: cambiaba lo que se veia en el panel y no
   * lo que el usuario podia hacer. Despues del bootstrap del primer admin no
   * quedaba ninguna forma soportada de crear un segundo admin de verdad.
   *
   * Este endpoint cierra ese hueco escribiendo primero la fuente de verdad y
   * replicando despues la copia, en ese orden. Es la pieza que faltaba para la
   * opcion 1 de la deuda de doble fuente de verdad (que la verdad viva aca).
   *
   * IDENTIFICADOR
   * Acepta uuid o email, igual que la baja administrativa: auth-service no
   * expone listado y lo que el operador tiene a mano es el email.
   *
   * ORDEN Y MODO DE FALLA
   * 1. Se escribe `users.role`. Si esto falla, no se hizo nada.
   * 2. Se replica al perfil de users-service por la UNICA llamada
   *    servicio-a-servicio que existe (`POST /users/profiles`), con el mismo
   *    mecanismo que usa el bootstrap del primer admin.
   * Si (2) falla, (1) NO se revierte: el rol efectivo es el de aca y revertirlo
   * para "quedar consistentes" dejaria al usuario sin el rol que el admin pidio
   * por un problema de red. Lo que queda desalineado es lo que LISTA el panel, y
   * eso viaja en la respuesta (`profileSync`) y en un log de error, nunca en
   * silencio.
   */
  async adminUpdateRole(
    identifier: string,
    role: AssignableRole,
    requesterRole?: string,
    requesterId?: string,
    requesterEmail?: string,
  ) {
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Se requiere rol admin');
    }

    // Sin `x-user-id` no se puede evaluar la guarda de auto-degradacion de
    // abajo, y una guarda que se desactiva omitiendo un header no es una
    // guarda. El gateway inyecta los tres `x-user-*` juntos o ninguno, asi que
    // llegar con rol pero sin id no es un caso legitimo. Falla cerrado.
    if (!requesterId) {
      throw new ForbiddenException('Falta la identidad del solicitante');
    }

    const user = await this.findByIdentifier(identifier);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Cambiarle el rol a una cuenta dada de baja no tiene efecto util (no puede
    // loguearse, asi que nunca va a renovar el token con el rol nuevo) y
    // enmascara el error de haber apuntado a la cuenta equivocada.
    if (user.deletedAt) {
      throw new BadRequestException(
        'La cuenta esta dada de baja; restaurala antes de cambiarle el rol',
      );
    }

    // Un admin que se degrada a si mismo pierde el acceso al panel y no puede
    // deshacerlo. Ademas es lo que hace innecesario contar admins: mientras
    // nadie pueda tocar su propio rol, degradar a otro siempre deja vivo al
    // menos al que ejecuto el cambio, o sea que la instalacion nunca llega a
    // cero admins por esta via.
    if (user.id === requesterId) {
      throw new BadRequestException(
        'No podes cambiar tu propio rol. Pediselo a otro admin.',
      );
    }

    const previousRole = user.role;
    const changed = previousRole !== role;

    if (changed) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
    }

    // Auditoria: quien le cambio el rol a quien. Identidades (uuid/email), que
    // es justamente lo que hay que poder reconstruir; ni hashes, ni tokens, ni
    // el secreto interno.
    this.logger.warn(
      `${changed ? 'CAMBIO' : 'NO-OP'} de rol: ${previousRole} -> ${role} ` +
        `sobre ${user.email} (userId=${user.id}) ` +
        `por ${requesterEmail ?? 'desconocido'} (requesterId=${requesterId})`,
    );

    // Se replica tambien en el no-op a proposito: si un intento anterior dejo
    // el perfil desincronizado, reintentar el mismo rol es la forma de
    // repararlo sin inventar un endpoint de "resincronizar".
    const profileSync = await this.replicateRoleToUsersService(
      user.id,
      role,
      user.profile?.displayName ?? user.email.split('@')[0],
      user.email,
    );

    return {
      id: user.id,
      email: user.email,
      role,
      previousRole,
      changed,
      profileSync,
      // El gateway autoriza por el claim `role` del JWT ya emitido, no por la
      // base. Mientras el usuario no vuelva a loguearse sigue operando con el
      // rol viejo. Ver el comentario de `validateToken`.
      tokenRefreshRequired: changed,
    };
  }

  /**
   * Resuelve un usuario por uuid o email.
   *
   * El email se busca case-insensitive porque el registro lo guarda TAL CUAL lo
   * tipeo el usuario: un `findUnique` exacto contra lo que escribe el operador
   * en el panel puede no encontrar una cuenta que existe.
   *
   * Si hay mas de una cuenta que solo difiere en capitalizacion (posible: el
   * unique de Postgres es case-sensitive) NO se adivina. Se exige el uuid. Un
   * cambio de rol sobre la cuenta equivocada es exactamente el error que este
   * endpoint no puede permitirse.
   */
  private async findByIdentifier(identifier: string) {
    const isEmail = identifier.includes('@');

    if (!isEmail && !UUID_RE.test(identifier)) {
      throw new BadRequestException(
        'Identificador invalido: se espera un userId (uuid) o un email',
      );
    }

    if (!isEmail) {
      return this.prisma.user.findUnique({
        where: { id: identifier },
        include: { profile: true },
      });
    }

    const matches = await this.prisma.user.findMany({
      where: { email: { equals: identifier, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      include: { profile: true },
    });

    if (matches.length <= 1) return matches[0] ?? null;

    const exact = matches.find((u) => u.email === identifier);
    if (exact) return exact;

    throw new ConflictException(
      'Hay mas de una cuenta con ese email en distinta capitalizacion; usa el userId (uuid)',
    );
  }

  /**
   * Replica el rol al perfil de users-service.
   *
   * Mismo canal que el bootstrap del primer admin: `POST /users/profiles`, la
   * unica llamada servicio-a-servicio del MVP, autenticada con
   * `x-internal-token`. No se abre un endpoint nuevo ni un segundo secreto.
   *
   * La diferencia con el bootstrap es el flag: aquel manda `bootstrapAdmin`
   * (que ademas fuerza `status=active` y levanta `deletedAt`, porque un admin
   * invisible en su propio panel no sirve). Aca va `forceRole`, que pisa
   * UNICAMENTE `role`. Cambiar un rol no es motivo para reactivar una cuenta
   * suspendida ni para revivir un perfil borrado.
   *
   * NUNCA tira: el rol ya esta aplicado en la fuente de verdad y el llamador
   * necesita saber eso aunque la replicacion falle. El fallo sale por el valor
   * de retorno y por un log de error.
   */
  private async replicateRoleToUsersService(
    userId: string,
    role: AssignableRole,
    displayName: string,
    contactEmail: string,
  ): Promise<ProfileSyncOutcome> {
    const usersServiceUrl = this.config.get('USERS_SERVICE_URL', 'http://localhost:3003');
    const internalToken = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    // users-service rechaza `forceRole` si el no tiene el secreto configurado
    // (falla cerrado a proposito). Mandarlo sin token es un 403 garantizado, asi
    // que se corta antes y se dice por que.
    if (!internalToken) {
      this.logger.error(
        `rol NO replicado a users-service: falta INTERNAL_SERVICE_TOKEN. ` +
          `El rol YA esta aplicado en auth-service y es el que va a llevar el proximo JWT, ` +
          `pero el panel va a seguir listando el rol viejo (userId=${userId}). ` +
          `Configura el secreto en los dos servicios y repeti el cambio de rol.`,
      );
      return 'skipped_no_token';
    }

    try {
      const res = await fetch(`${usersServiceUrl}/api/v1/users/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': internalToken,
        },
        body: JSON.stringify({
          userId,
          displayName,
          role,
          contactEmail,
          forceRole: true,
        }),
      });

      if (!res.ok) {
        // Se loguea el status, nunca el token ni el body de la respuesta.
        this.logger.error(
          `users-service rechazo la replicacion del rol: HTTP ${res.status} ` +
            `(userId=${userId}, role=${role}). El rol quedo aplicado en auth-service; ` +
            `el panel va a listar el rol viejo hasta que se repita el cambio.`,
        );
        return 'failed';
      }

      return 'ok';
    } catch {
      this.logger.error(
        `no se pudo contactar a users-service para replicar el rol ` +
          `(userId=${userId}, role=${role}). El rol quedo aplicado en auth-service; ` +
          `el panel va a listar el rol viejo hasta que se repita el cambio.`,
      );
      return 'failed';
    }
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '7d',
    });
  }

  // Sync user profile to users-service so profile lookups work across services
  private async syncProfileToUsersService(
    userId: string,
    displayName: string,
    role: string,
    contactEmail: string,
  ): Promise<void> {
    const usersServiceUrl = this.config.get('USERS_SERVICE_URL', 'http://localhost:3003');

    // Credencial de la llamada interna. users-service la exige en cuanto tiene
    // seteada su propia INTERNAL_SERVICE_TOKEN, así que la variable se setea
    // PRIMERO acá y recién después allá (al revés, la sincronización de perfiles
    // queda rechazada en el intervalo).
    const internalToken = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    try {
      // `contactEmail` se recibía y no se enviaba: users-service guardaba el
      // perfil sin email y la búsqueda del panel de admin (findAll filtra por
      // displayName OR contactEmail) nunca podía matchear por email.
      const res = await fetch(`${usersServiceUrl}/api/v1/users/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(internalToken ? { 'x-internal-token': internalToken } : {}),
        },
        body: JSON.stringify({ userId, displayName, role, contactEmail }),
      });

      // Sin esto un 403 por secreto desalineado era indistinguible del éxito:
      // el perfil no se creaba y no quedaba rastro en ningún lado. Se loguea el
      // status, nunca el token ni el body.
      if (!res.ok) {
        console.warn(
          `[auth] profile sync rechazado por users-service: HTTP ${res.status} (userId=${userId})`,
        );
      }
    } catch {
      // Non-fatal: profile sync failure should not block auth
    }
  }
}
