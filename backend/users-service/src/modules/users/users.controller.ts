import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  UpdateNotificationSettingsDto,
  UpdateStatusDto,
} from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Internal: called by auth-service after registration
  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  createProfile(@Body() body: { userId: string; displayName: string; role: string }) {
    return this.usersService.createProfile(body.userId, body);
  }

  // Admin: list all users
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ search, role, status, page, limit });
  }

  // Get any user profile by userId
  @Get(':userId')
  findById(@Param('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  // Update own profile
  @Put(':userId/profile')
  updateProfile(
    @Param('userId') userId: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, requesterId, requesterRole, dto);
  }

  // Update notification settings
  @Patch(':userId/notifications')
  updateNotifications(
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(userId, dto);
  }

  // Admin: update status (active/suspended)
  @Patch(':userId/status')
  updateStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(userId, dto);
  }

  // Admin: update role
  @Patch(':userId/role')
  updateRole(
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.usersService.updateRole(userId, body.role);
  }

  // Internal: increment asset count
  @Patch(':userId/asset-count')
  incrementAssetCount(
    @Param('userId') userId: string,
    @Body() body: { delta?: number },
  ) {
    return this.usersService.incrementAssetCount(userId, body.delta);
  }

  // Internal: increment license count
  @Patch(':userId/license-count')
  incrementLicenseCount(
    @Param('userId') userId: string,
    @Body() body: { delta?: number },
  ) {
    return this.usersService.incrementLicenseCount(userId, body.delta);
  }

  @Delete(':userId')
  softDelete(@Param('userId') userId: string) {
    return this.usersService.softDelete(userId);
  }
}
