import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/admin.guard';
import { LogModerationDto } from './dto/log-moderation.dto';
import { RecordSnapshotDto } from './dto/record-snapshot.dto';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { QueryModerationLogsDto } from './dto/query-moderation-logs.dto';

/**
 * `AdminGuard` a nivel de controller: TODO `/api/v1/admin/*` exige
 * `x-user-role === 'admin'`, incluso si el request no pasó por el gateway.
 * Ver el comentario largo en `common/admin.guard.ts`.
 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardOverview();
  }

  @Get('metrics')
  getMetrics(@Query() query: QueryMetricsDto) {
    return this.adminService.getMetrics(query.range ?? '30d');
  }

  @Post('metrics/snapshot')
  @HttpCode(HttpStatus.CREATED)
  recordSnapshot(@Body() dto: RecordSnapshotDto) {
    return this.adminService.recordSnapshot(dto);
  }

  @Post('moderation/log')
  @HttpCode(HttpStatus.CREATED)
  logModeration(
    @Headers('x-user-id') adminId: string,
    @Body() dto: LogModerationDto,
  ) {
    return this.adminService.logModeration({ ...dto, adminId });
  }

  @Get('moderation/logs')
  getModerationLogs(@Query() query: QueryModerationLogsDto) {
    return this.adminService.getModerationLogs(query);
  }
}
