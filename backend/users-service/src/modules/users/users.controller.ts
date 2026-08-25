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
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IncrementCountDto } from './dto/increment-count.dto';

/**
 * Autorización: este servicio confía en los headers `x-user-id` / `x-user-role`
 * que inyecta el gateway tras validar el JWT. Los chequeos de abajo son
 * defensa en profundidad: si alguien llega al servicio SIN pasar por el gateway,
 * los headers vienen vacíos y las operaciones fallan cerradas (403) en vez de
 * ejecutarse. No sustituyen a que el servicio no sea alcanzable desde internet.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Internal: called by auth-service after registration
  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  createProfile(@Body() dto: CreateProfileDto) {
    return this.usersService.createProfile(dto);
  }

  // Admin: list all users
  @Get()
  findAll(
    @Headers('x-user-role') requesterRole: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    this.usersService.assertAdmin(requesterRole);
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
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    this.usersService.assertSelfOrAdmin(userId, requesterId, requesterRole);
    return this.usersService.updateNotificationSettings(userId, dto);
  }

  // Admin: update status (active/suspended)
  @Patch(':userId/status')
  updateStatus(
    @Param('userId') userId: string,
    @Headers('x-user-role') requesterRole: string,
    @Body() dto: UpdateStatusDto,
  ) {
    this.usersService.assertAdmin(requesterRole);
    return this.usersService.updateStatus(userId, dto);
  }

  // Admin: update role
  @Patch(':userId/role')
  updateRole(
    @Param('userId') userId: string,
    @Headers('x-user-role') requesterRole: string,
    @Body() dto: UpdateRoleDto,
  ) {
    this.usersService.assertAdmin(requesterRole);
    return this.usersService.updateRole(userId, dto.role);
  }

  // Internal: increment asset count
  @Patch(':userId/asset-count')
  incrementAssetCount(
    @Param('userId') userId: string,
    @Headers('x-user-role') requesterRole: string,
    @Body() dto: IncrementCountDto,
  ) {
    this.usersService.assertAdmin(requesterRole);
    return this.usersService.incrementAssetCount(userId, dto.delta);
  }

  // Internal: increment license count
  @Patch(':userId/license-count')
  incrementLicenseCount(
    @Param('userId') userId: string,
    @Headers('x-user-role') requesterRole: string,
    @Body() dto: IncrementCountDto,
  ) {
    this.usersService.assertAdmin(requesterRole);
    return this.usersService.incrementLicenseCount(userId, dto.delta);
  }

  @Delete(':userId')
  softDelete(
    @Param('userId') userId: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
  ) {
    this.usersService.assertSelfOrAdmin(userId, requesterId, requesterRole);
    return this.usersService.softDelete(userId);
  }

  @Get(':userId/saved')
  getSavedAssets(
    @Param('userId') userId: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
  ) {
    this.usersService.assertSelfOrAdmin(userId, requesterId, requesterRole);
    return this.usersService.getSavedAssets(userId);
  }

  @Post(':userId/saved/:assetId')
  @HttpCode(HttpStatus.CREATED)
  saveAsset(
    @Param('userId') userId: string,
    @Param('assetId') assetId: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
  ) {
    this.usersService.assertSelfOrAdmin(userId, requesterId, requesterRole);
    return this.usersService.saveAsset(userId, assetId);
  }

  @Delete(':userId/saved/:assetId')
  unsaveAsset(
    @Param('userId') userId: string,
    @Param('assetId') assetId: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
  ) {
    this.usersService.assertSelfOrAdmin(userId, requesterId, requesterRole);
    return this.usersService.unsaveAsset(userId, assetId);
  }
}
