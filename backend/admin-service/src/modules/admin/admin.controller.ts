import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardOverview();
  }

  @Get('metrics')
  getMetrics(@Query('range') range: '7d' | '30d' | '90d' | '365d' = '30d') {
    return this.adminService.getMetrics(range);
  }

  @Post('metrics/snapshot')
  @HttpCode(HttpStatus.CREATED)
  recordSnapshot(
    @Body() body: {
      totalUsers: number;
      newUsers: number;
      totalAssets: number;
      publishedAssets: number;
      totalRequests: number;
      closedRequests: number;
      totalViews: number;
    },
  ) {
    return this.adminService.recordSnapshot(body);
  }

  @Post('moderation/log')
  @HttpCode(HttpStatus.CREATED)
  logModeration(
    @Headers('x-user-id') adminId: string,
    @Body() body: {
      assetId: string;
      assetTitle: string;
      action: 'approved' | 'rejected' | 'flagged' | 'restored';
      notes?: string;
    },
  ) {
    return this.adminService.logModeration({ ...body, adminId });
  }

  @Get('moderation/logs')
  getModerationLogs(
    @Query('assetId') assetId?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getModerationLogs({ assetId, adminId, action, page, limit });
  }
}
