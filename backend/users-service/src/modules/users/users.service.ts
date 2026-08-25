import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateProfileDto,
  UpdateNotificationSettingsDto,
  UpdateStatusDto,
} from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { search, role, status, page = 1, limit = 20 } = filters;

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

  async softDelete(userId: string) {
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
