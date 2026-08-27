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
import { sanitizeForNotification, sanitizeSingleLine } from '../../common/text-sanitizer';

/** Tope duro de filas por página de notificaciones (el poll pide cada 30s). */
const MAX_NOTIFICATIONS = 100;

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private async createNotification(userId: string, type: string, title: string, body: string, link?: string) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, link },
    }).catch(() => {});
  }

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

    // `assetTitle` lo manda el cliente y NO se valida contra assets-service.
    // Se guarda saneado para que no pueda falsear su propia presentación en la
    // bandeja del titular (saltos de línea, overrides bidi, zero-width).
    const assetTitle = sanitizeSingleLine(dto.assetTitle, 200);

    const request = await this.prisma.licenseRequest.create({
      data: {
        assetId: dto.assetId,
        assetTitle,
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

    // Esta es la ÚNICA notificación que llega a alguien sin relación previa con
    // el emisor, con texto que eligió el emisor. Es el canal de phishing del
    // producto: se sanea y se neutralizan URLs antes de interpolar.
    this.createNotification(
      dto.ownerId,
      'new_request',
      'Nueva solicitud recibida',
      `Alguien quiere licenciar "${sanitizeForNotification(assetTitle)}"`,
      '/dashboard/requests',
    );

    return request;
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

    // Notify the other party
    const recipientId = request.requesterId === senderId ? request.ownerId : request.requesterId;
    this.createNotification(
      recipientId,
      'new_message',
      'Nuevo mensaje',
      `Tenés un nuevo mensaje en la solicitud de "${sanitizeForNotification(request.assetTitle)}"`,
      '/dashboard/requests',
    );

    return message;
  }

  async updateStatus(requestId: string, userId: string, dto: UpdateRequestStatusDto) {
    const request = await this.prisma.licenseRequest.findFirst({
      where: { id: requestId, deletedAt: null },
    });

    if (!request) throw new NotFoundException('Request not found');

    // `closed` y `rejected` son ESTADOS TERMINALES. Sin este chequeo el titular
    // podía reabrir una negociación ya cerrada (closed -> accepted), lo que
    // reescribe el registro del cierre declarado y le vuelve a abrir el hilo a
    // la contraparte sin su intervención.
    if (request.status === 'closed' || request.status === 'rejected') {
      throw new ConflictException('Esta solicitud ya está cerrada y no admite cambios de estado');
    }

    if (request.status === dto.status) {
      throw new ConflictException(`La solicitud ya está en estado "${dto.status}"`);
    }

    // Only owner can accept/reject; both parties can close
    if ((dto.status === 'accepted' || dto.status === 'rejected') && request.ownerId !== userId) {
      throw new ForbiddenException('Only the asset owner can accept or reject requests');
    }

    if (dto.status === 'closed' && request.requesterId !== userId && request.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    const updated = await this.prisma.licenseRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        closedAt: ['closed', 'rejected'].includes(dto.status) ? new Date() : undefined,
      },
    });

    // Notify the requester of status changes
    const titulo = sanitizeForNotification(request.assetTitle);
    const statusMessages: Record<string, { title: string; body: string }> = {
      accepted: { title: 'Solicitud aceptada', body: `Tu solicitud de "${titulo}" fue aceptada` },
      rejected: { title: 'Solicitud rechazada', body: `Tu solicitud de "${titulo}" fue rechazada` },
      closed: { title: 'Conversación cerrada', body: `La conversación sobre "${titulo}" fue cerrada` },
    };

    if (statusMessages[dto.status]) {
      const notifyUserId = userId === request.ownerId ? request.requesterId : request.ownerId;
      this.createNotification(
        notifyUserId,
        `request_${dto.status}`,
        statusMessages[dto.status].title,
        statusMessages[dto.status].body,
        '/dashboard/requests',
      );
    }

    return updated;
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

  async getNotifications(userId: string, limit: any = 20) {
    // `@Query('limit')` con `transform: true` entrega el resultado de Number():
    // `?limit=abc` llegaba como NaN y Prisma reventaba con un 500, y
    // `?limit=1000000` pedía un millón de filas en un endpoint que el frontend
    // pollea cada 30 segundos. El default del parámetro no cubre ninguno de los
    // dos casos porque NaN no es `undefined`.
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), MAX_NOTIFICATIONS);

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { notifications, unreadCount };
  }

  async markNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async findAll(filters: { status?: string; page?: any; limit?: any }) {
    const { status } = filters;
    const safePage = Math.max(1, parseInt(filters.page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(filters.limit) || 20), 100);
    const where: any = { deletedAt: null };
    // Un `status` arbitrario reventaba como error de enum de Prisma (500).
    if (status && ['pending', 'accepted', 'rejected', 'closed'].includes(status)) {
      where.status = status;
    }

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
