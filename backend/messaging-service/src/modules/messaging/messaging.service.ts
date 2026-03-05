import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRequestDto,
  SendMessageDto,
  UpdateRequestStatusDto,
} from './dto/create-request.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(requesterId: string, dto: CreateRequestDto) {
    // Prevent users from requesting their own assets
    if (requesterId === dto.ownerId) {
      throw new ConflictException('No podés solicitar tu propio activo');
    }

    // Prevent duplicate pending requests for the same asset
    const existing = await this.prisma.licenseRequest.findFirst({
      where: {
        assetId: dto.assetId,
        requesterId,
        status: 'pending',
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('You already have a pending request for this asset');
    }

    return this.prisma.licenseRequest.create({
      data: {
        assetId: dto.assetId,
        assetTitle: dto.assetTitle,
        requesterId,
        ownerId: dto.ownerId,
        initialMessage: dto.initialMessage,
        proposedTerms: dto.proposedTerms,
        messages: {
          create: {
            senderId: requesterId,
            content: dto.initialMessage,
          },
        },
      },
      include: {
        messages: true,
      },
    });
  }

  async findRequestsByUser(userId: string, role: 'requester' | 'owner' | 'all', page: any = 1, limit: any = 20) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);

    const where: any = { deletedAt: null };

    if (role === 'requester') where.requesterId = userId;
    else if (role === 'owner') where.ownerId = userId;
    else where.OR = [{ requesterId: userId }, { ownerId: userId }];

    const skip = (safePage - 1) * safeLimit;

    const [total, data] = await Promise.all([
      this.prisma.licenseRequest.count({ where }),
      this.prisma.licenseRequest.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  async findRequestById(id: string, userId: string) {
    const request = await this.prisma.licenseRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) throw new NotFoundException('Request not found');

    if (request.requesterId !== userId && request.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    // Mark messages as read for this user
    await this.prisma.message.updateMany({
      where: {
        requestId: id,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return request;
  }

  async sendMessage(requestId: string, senderId: string, dto: SendMessageDto) {
    const request = await this.prisma.licenseRequest.findFirst({
      where: { id: requestId, deletedAt: null },
    });

    if (!request) throw new NotFoundException('Request not found');

    if (request.requesterId !== senderId && request.ownerId !== senderId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    if (request.status === 'closed' || request.status === 'rejected') {
      throw new ForbiddenException('This conversation is closed');
    }

    const message = await this.prisma.message.create({
      data: {
        requestId,
        senderId,
        content: dto.content,
      },
    });

    // Update the request's updatedAt for ordering
    await this.prisma.licenseRequest.update({
      where: { id: requestId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async updateStatus(requestId: string, userId: string, dto: UpdateRequestStatusDto) {
    const request = await this.prisma.licenseRequest.findFirst({
      where: { id: requestId, deletedAt: null },
    });

    if (!request) throw new NotFoundException('Request not found');

    // Only owner can accept/reject; both parties can close
    if ((dto.status === 'accepted' || dto.status === 'rejected') && request.ownerId !== userId) {
      throw new ForbiddenException('Only the asset owner can accept or reject requests');
    }

    if (dto.status === 'closed' && request.requesterId !== userId && request.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return this.prisma.licenseRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        closedAt: ['closed', 'rejected'].includes(dto.status) ? new Date() : undefined,
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const requests = await this.prisma.licenseRequest.findMany({
      where: {
        deletedAt: null,
        OR: [{ requesterId: userId }, { ownerId: userId }],
      },
      select: { id: true },
    });

    const requestIds = requests.map((r) => r.id);

    return this.prisma.message.count({
      where: {
        requestId: { in: requestIds },
        senderId: { not: userId },
        readAt: null,
        deletedAt: null,
      },
    });
  }

  async findAll(filters: { status?: string; page?: any; limit?: any }) {
    const { status } = filters;
    const safePage = Math.max(1, parseInt(filters.page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(filters.limit) || 20), 100);
    const where: any = { deletedAt: null };
    if (status) where.status = status;

    const skip = (safePage - 1) * safeLimit;

    const [total, data] = await Promise.all([
      this.prisma.licenseRequest.count({ where }),
      this.prisma.licenseRequest.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
    ]);

    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }
}
