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
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import {
  CreateRequestDto,
  SendMessageDto,
  UpdateRequestStatusDto,
} from './dto/create-request.dto';

@Controller('requests')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRequest(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.messagingService.createRequest(userId, dto);
  }

  // Admin: get all requests
  @Get('all')
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

  @Post(':id/messages')
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
