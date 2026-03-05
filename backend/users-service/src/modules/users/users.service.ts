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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createProfile(userId: string, data: { displayName: string; role: string }) {
    return this.prisma.userProfile.create({
      data: {
        userId,
        displayName: data.displayName,
        role: data.role as any,
        notificationSettings: {
          create: {} as any,
        },
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
      data: { status: dto.status as any },
    });
  }

  async updateRole(userId: string, role: string) {
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    return this.prisma.userProfile.update({
      where: { userId },
      data: { role: role as any },
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
}
