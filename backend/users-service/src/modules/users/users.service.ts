import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { secretsMatch } from '../../common/internal-auth';
import {
  UpdateProfileDto,
  UpdateNotificationSettingsDto,
  UpdateStatusDto,
} from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Autoriza el ÚNICO endpoint servicio-a-servicio del sistema
   * (`POST /users/profiles`, que llama auth-service al registrar/loguear).
   *
   * Antes no validaba nada. Como el gateway proxea `/api/v1/users/*`, cualquier
   * usuario logueado podía crear perfiles arbitrarios — incluido uno con
   * `role: 'admin'`, que es el que lee el panel de administración.
   *
   * Dos modos, a propósito:
   *
   * 1. `INTERNAL_SERVICE_TOKEN` seteado → se exige el header `x-internal-token`
   *    y se compara en tiempo constante. Es el control real: un secreto que solo
   *    conocen auth-service y users-service, y que además NO puede viajar desde
   *    afuera porque el proxy del gateway no reenvía headers arbitrarios.
   *
   * 2. Sin `INTERNAL_SERVICE_TOKEN` → se rechaza toda request que traiga
   *    identidad de gateway (`x-user-id` / `x-user-email` / `x-user-role`).
   *    auth-service llama por la red interna sin ninguno de esos headers, y el
   *    gateway SIEMPRE inyecta los tres para esta ruta (no está en su lista de
   *    exclusiones), así que "trae identidad" equivale a "vino de afuera".
   *
   * El modo 2 existe para que este fix se pueda desplegar sin coordinar una
   * variable de entorno nueva: cierra el agujero hoy y se endurece solo cuando
   * el secreto exista. Es un backstop, no el destino final.
   */
  assertInternalCaller(ctx: {
    internalToken?: string;
    gatewayUserId?: string;
    gatewayEmail?: string;
    gatewayRole?: string;
  }): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    if (expected) {
      if (!secretsMatch(ctx.internalToken, expected)) {
        throw new ForbiddenException('Endpoint interno: credencial de servicio inválida');
      }
      return;
    }

    if (ctx.gatewayUserId || ctx.gatewayEmail || ctx.gatewayRole) {
      throw new ForbiddenException('Endpoint interno: no accesible desde el gateway');
    }
  }

  /**
   * El requester (según los headers que inyecta el gateway) es el dueño del
   * recurso o es admin. Falla cerrado: sin header no hay acceso.
   */
  assertSelfOrAdmin(userId: string, requesterId?: string, requesterRole?: string): void {
    if (requesterRole === 'admin') return;
    if (requesterId && requesterId === userId) return;
    throw new ForbiddenException('No tenés permiso sobre este usuario');
  }

  assertAdmin(requesterRole?: string): void {
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Se requiere rol admin');
    }
  }

  async findById(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { notificationSettings: true },
    });

    if (!profile || profile.deletedAt) throw new NotFoundException('User not found');
    return profile;
  }

  async findAll(filters: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, role, status } = filters;

    // Los defaults de destructuring (`page = 1`) NO alcanzaban, y por eso este
    // endpoint —el listado de usuarios del panel de admin— devolvia 500 salvo
    // que el llamador mandara page Y limit los dos.
    //
    // Motivo: el ValidationPipe global corre con `transform: true`, asi que un
    // `@Query('page') page?: number` ausente llega como NaN (no como undefined)
    // y el default nunca se aplica. Con page=NaN, `skip = (page-1)*limit` da
    // NaN y Prisma rechaza la query entera con "Argument `skip` is missing".
    //
    // El frontend pega exactamente asi: `/users?limit=1` (dashboard de admin y
    // metricas) y `/users?limit=100` (listado), siempre sin `page`.
    const page = Number.isFinite(Number(filters.page)) && Number(filters.page) >= 1
      ? Math.floor(Number(filters.page))
      : 1;
    const limit = Number.isFinite(Number(filters.limit)) && Number(filters.limit) >= 1
      ? Math.floor(Number(filters.limit))
      : 20;

    const where: any = { deletedAt: null };
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.userProfile.count({ where }),
      this.prisma.userProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { notificationSettings: true },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Idempotente a propósito. auth-service llama a este endpoint no solo al
   * registrar sino tambien en cada login (para cubrir cuentas legacy sin
   * perfil): con `create` a secas, cada login posterior violaba el unique de
   * `userId` y devolvía un 500 que el llamador descartaba en silencio. Con
   * upsert, el reintento es un no-op barato y el perfil se autorrepara.
   */
  async createProfile(dto: CreateProfileDto) {
    const esBootstrapAdmin = dto.bootstrapAdmin === true;

    if (esBootstrapAdmin) {
      // Cerrojo 1: solo en modo token verificado. En el modo backstop
      // (`INTERNAL_SERVICE_TOKEN` vacio) el unico control es "no traer headers
      // de gateway", que cualquiera con acceso a la red interna puede cumplir.
      // Escribir `role` en base a eso seria demasiado. Falla cerrado.
      if (!this.config.get<string>('INTERNAL_SERVICE_TOKEN')) {
        throw new ForbiddenException(
          'bootstrapAdmin requiere INTERNAL_SERVICE_TOKEN configurado en users-service',
        );
      }
      // Cerrojo 2: el flag solo sirve para promover a admin. No es un
      // "forzar rol arbitrario" de proposito general.
      if (dto.role !== 'admin') {
        throw new BadRequestException('bootstrapAdmin solo es valido con role="admin"');
      }
      // Auditoria del lado de users-service. Nunca se loguea el token.
      console.warn(
        `[users][bootstrap-admin] promoviendo perfil a admin (userId=${dto.userId}).`,
      );
    }

    return this.prisma.userProfile.upsert({
      where: { userId: dto.userId },
      create: {
        userId: dto.userId,
        displayName: dto.displayName,
        role: dto.role,
        contactEmail: dto.contactEmail,
        notificationSettings: { create: {} },
      },
      update: {
        // No pisa displayName ni role: el usuario pudo haberlos cambiado desde
        // el perfil o un admin desde el panel. Solo rellena el email si falta.
        ...(dto.contactEmail ? { contactEmail: dto.contactEmail } : {}),
        // Unica excepcion a lo de arriba: el bootstrap del primer admin. Se
        // alinea tambien `status` y se levanta un `deletedAt` porque un perfil
        // suspendido o borrado no aparece en el listado del panel — un admin
        // invisible en su propio panel es la clase de estado a medias que este
        // mecanismo existe para evitar. Del lado de auth ya se verifico que la
        // cuenta esta activa y no borrada.
        ...(esBootstrapAdmin
          ? { role: 'admin' as const, status: 'active' as const, deletedAt: null }
          : {}),
      },
      include: { notificationSettings: true },
    });
  }

  async updateProfile(userId: string, requesterId: string, requesterRole: string, dto: UpdateProfileDto) {
    if (userId !== requesterId && requesterRole !== 'admin') {
      throw new ForbiddenException('You cannot update another user\'s profile');
    }

    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    return this.prisma.userProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { notificationSettings: true },
    });

    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    if (existing.notificationSettings) {
      return this.prisma.notificationSettings.update({
        where: { userId },
        data: dto,
      });
    } else {
      return this.prisma.notificationSettings.create({
        data: { userId, ...dto },
      });
    }
  }

  async updateStatus(userId: string, dto: UpdateStatusDto) {
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    return this.prisma.userProfile.update({
      where: { userId },
      data: { status: dto.status as 'active' | 'suspended' },
    });
  }

  async updateRole(userId: string, role: 'admin' | 'asset_owner' | 'entrepreneur') {
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    return this.prisma.userProfile.update({
      where: { userId },
      data: { role: role as 'admin' | 'asset_owner' | 'entrepreneur' },
    });
  }

  async incrementAssetCount(userId: string, delta: number = 1) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: { assetCount: { increment: delta } },
    });
  }

  async incrementLicenseCount(userId: string, delta: number = 1) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: { licenseCount: { increment: delta } },
    });
  }

  /**
   * Sin el chequeo previo, borrar un userId inexistente llegaba a Prisma como
   * un `update` sin match: P2025 sin capturar = 500. Ahora es 404, y repetir la
   * baja es un no-op idempotente en vez de repisar `deletedAt`.
   */
  async softDelete(userId: string) {
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.deletedAt) return existing;

    return this.prisma.userProfile.update({
      where: { userId },
      data: { deletedAt: new Date() },
    });
  }

  async getSavedAssets(userId: string) {
    const saved = await this.prisma.savedAsset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { assetId: true },
    });
    return { data: saved.map((s) => s.assetId), total: saved.length };
  }

  async saveAsset(userId: string, assetId: string) {
    return this.prisma.savedAsset.upsert({
      where: { userId_assetId: { userId, assetId } },
      create: { userId, assetId },
      update: {},
    });
  }

  async unsaveAsset(userId: string, assetId: string) {
    await this.prisma.savedAsset.deleteMany({ where: { userId, assetId } });
    return { message: 'Asset removed from saved' };
  }
}
