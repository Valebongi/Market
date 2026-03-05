import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateAssetDto) {
    let slug = slugify(dto.title);
    const existing = await this.prisma.asset.findFirst({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const { tags, links, allowedUses, restrictions, ...assetData } = dto;

    const asset = await this.prisma.asset.create({
      data: {
        ...(assetData as any),
        ownerId,
        slug,
        allowedUses: allowedUses ?? [],
        restrictions: restrictions ?? [],
        tags: tags?.length
          ? { create: tags.map((tag) => ({ tag })) }
          : undefined,
        links: links?.length
          ? { create: links.map((l) => ({ label: l.label, url: l.url, isMain: l.isMain ?? false })) }
          : undefined,
      },
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    return asset;
  }

  async findAll(filters: FilterAssetsDto) {
    const {
      search,
      category,
      licenseType,
      pricingType,
      status,
      ownerId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12,
    } = filters;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (licenseType) where.licenseType = licenseType;
    if (pricingType) where.pricingType = pricingType;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          tags: true,
          links: { where: { isMain: true } },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    // Increment view count
    await this.prisma.asset.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return asset;
  }

  async findBySlug(slug: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { slug, deletedAt: null, status: 'published' },
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    await this.prisma.asset.update({
      where: { id: asset.id },
      data: { viewCount: { increment: 1 } },
    });

    return asset;
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this asset');
    }

    const dtoAny = dto as any;
    const { tags, links, allowedUses, restrictions, ...updateData } = dtoAny;

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(updateData as any),
        allowedUses: allowedUses ?? asset.allowedUses,
        restrictions: restrictions ?? asset.restrictions,
        publishedAt:
          updateData.status === 'published' && asset.status !== 'published'
            ? new Date()
            : undefined,
        tags: tags !== undefined
          ? {
              deleteMany: {},
              create: tags.map((tag: string) => ({ tag })),
            }
          : undefined,
        links: links !== undefined
          ? {
              deleteMany: {},
              create: links.map((l: any) => ({ label: l.label, url: l.url, isMain: l.isMain ?? false })),
            }
          : undefined,
      } as any,
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    return updated;
  }

  async publish(id: string, userId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.status === 'published') {
      throw new ConflictException('Asset is already published');
    }

    return this.prisma.asset.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async archive(id: string, userId: string, userRole: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to archive this asset');
    }

    return this.prisma.asset.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async flag(id: string, reportedBy: string, reason: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    await this.prisma.assetFlag.create({
      data: { assetId: id, reportedBy, reason },
    });

    // Auto-flag the asset if it gets >= 3 unresolved flags
    const flagCount = await this.prisma.assetFlag.count({
      where: { assetId: id, resolved: false },
    });

    if (flagCount >= 3) {
      await this.prisma.asset.update({
        where: { id },
        data: { status: 'flagged' },
      });
    }

    return { message: 'Asset flagged successfully' };
  }

  async remove(id: string, userId: string, userRole: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this asset');
    }

    await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Asset deleted successfully' };
  }

  async incrementRequestCount(id: string) {
    await this.prisma.asset.update({
      where: { id },
      data: { requestCount: { increment: 1 } },
    });
  }
}
