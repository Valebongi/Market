import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { UserContextGuard, AdminGuard } from '../../common/user-context.guard';
import {
  CreateRequestRateLimitGuard,
  SendMessageRateLimitGuard,
} from '../../common/rate-limit.guard';
import {
  CreateRequestDto,
  SendMessageDto,
  UpdateRequestStatusDto,
} from './dto/create-request.dto';

@Controller('requests')
@UseGuards(UserContextGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // Cada alta notifica a `ownerId`, que lo declara el cliente y no se valida
  // contra assets-service. Sin cupo por usuario, un atacante inunda la bandeja
  // de cualquier usuario que elija. Ver rate-limit.guard.ts.
  @Post()
  @UseGuards(CreateRequestRateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  createRequest(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.messagingService.createRequest(userId, dto);
  }

  // Admin: get all requests.
  // AdminGuard es OBLIGATORIO acá: este endpoint devuelve TODA solicitud de la
  // plataforma, con initialMessage, proposedTerms y el último mensaje del hilo.
  // El gateway no lo protege (sus ADMIN_ROUTE_PREFIXES/ADMIN_EXACT_ROUTES solo
  // cubren /api/v1/admin y /api/v1/users), así que
  // sin este guard cualquier usuario logueado se lleva las negociaciones ajenas.
  @Get('all')
  @UseGuards(AdminGuard)
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.findAll({ status, page, limit });
  }

  @Get('unread-count')
  getUnreadCount(@Headers('x-user-id') userId: string) {
    return this.messagingService.getUnreadCount(userId);
  }

  @Get('notifications')
  getNotifications(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getNotifications(userId, limit);
  }

  @Patch('notifications/read-all')
  markNotificationsRead(@Headers('x-user-id') userId: string) {
    return this.messagingService.markNotificationsRead(userId);
  }

  @Get('mine')
  findMyRequests(
    @Headers('x-user-id') userId: string,
    @Query('role') role: 'requester' | 'owner' | 'all' = 'all',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.findRequestsByUser(userId, role, page, limit);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.messagingService.findRequestById(id, userId);
  }

  // Cada mensaje notifica a la contraparte: el hilo es un canal de spam contra
  // alguien con quien ya hay relación. Mismo criterio de cupo.
  @Post(':id/messages')
  @UseGuards(SendMessageRateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') requestId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(requestId, userId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') requestId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.messagingService.updateStatus(requestId, userId, dto);
  }
}
