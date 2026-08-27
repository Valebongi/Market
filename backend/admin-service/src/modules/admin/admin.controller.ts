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

  /**
   * `x-user-id` no es opcional: `AdminGuard` ya garantizo que viene, que no
   * esta vacio y que tiene forma sana. Se propaga para que la fila quede
   * ATRIBUIDA — el upsert por fecha deja que cualquier admin pise el snapshot
   * de hoy, y sin autor eso era gratis y anonimo.
   */
  @Post('metrics/snapshot')
  @HttpCode(HttpStatus.CREATED)
  recordSnapshot(
    @Headers('x-user-id') adminId: string,
    @Body() dto: RecordSnapshotDto,
  ) {
    return this.adminService.recordSnapshot(dto, adminId);
  }

  /**
   * `adminId` sale del header, pero ya paso por `AdminGuard`, que lo exige no
   * vacio y con forma de id. Antes viajaba crudo hasta la columna de
   * auditoria: se podia firmar una decision de moderacion con id vacio o con
   * el id de OTRO admin. Ver el comentario de `common/admin.guard.ts`.
   */
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
