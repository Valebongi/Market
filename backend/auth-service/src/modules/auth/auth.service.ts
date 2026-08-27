import {
  Injectable,
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

@Injectable()
export class AuthService {
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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

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
