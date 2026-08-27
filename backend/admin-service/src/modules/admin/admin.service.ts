import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async logModeration(data: {
    assetId: string;
    assetTitle: string;
    adminId: string;
    action: 'approved' | 'rejected' | 'flagged' | 'restored';
    notes?: string;
  }) {
    return this.prisma.moderationLog.create({ data });
  }

  async getModerationLogs(filters: {
    assetId?: string;
    adminId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { assetId, adminId, action, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.moderationLog.count({ where }),
      this.prisma.moderationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Upsert por fecha: un snapshot por dia que se refresca. Eso es intencional,
   * pero significa que cualquier admin puede pisar los numeros de hoy con lo
   * que quiera, las veces que quiera. `recordedBy` no lo impide —no deberia—
   * pero lo hace ATRIBUIBLE: queda quien lo escribio y cuando (`updatedAt`).
   *
   * OJO, y esto NO se arregla desde este servicio: los valores llegan del
   * navegador del admin, no de una lectura autoritativa de las otras bases.
   * Ver el reporte: `newUsers`, `closedRequests` y `totalViews` los manda el
   * frontend hardcodeados en 0, asi que `conversionRate` es estructuralmente
   * 0% siempre. Que el snapshot lo alimente un job del backend en vez del
   * navegador es una decision de arquitectura (llamadas cruzadas entre
   * servicios), no un fix local.
   */
  async recordSnapshot(
    data: {
      totalUsers: number;
      newUsers: number;
      totalAssets: number;
      publishedAssets: number;
      totalRequests: number;
      closedRequests: number;
      totalViews: number;
    },
    recordedBy: string,
  ) {
    // setUTCHours, no setHours. La columna `date` es `@db.Date` y Prisma la
    // serializa en UTC: con `setHours` la medianoche LOCAL de un contenedor en
    // UTC+X cae el día anterior en UTC y el upsert pisa el snapshot equivocado.
    // En Railway (UTC) el resultado es idéntico; en cualquier otra TZ, no.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.metricSnapshot.upsert({
      where: { date: today },
      update: { ...data, recordedBy },
      create: { date: today, ...data, recordedBy },
    });
  }

  async getMetrics(range: '7d' | '30d' | '90d' | '365d' = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range];
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const snapshots = await this.prisma.metricSnapshot.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    if (snapshots.length === 0) {
      return { snapshots: [], summary: null };
    }

    const latest = snapshots[snapshots.length - 1];
    const first = snapshots[0];

    const summary = {
      totalUsers: latest.totalUsers,
      userGrowth: first.totalUsers > 0
        ? ((latest.totalUsers - first.totalUsers) / first.totalUsers * 100).toFixed(1)
        : '0',
      totalAssets: latest.totalAssets,
      publishedAssets: latest.publishedAssets,
      totalRequests: latest.totalRequests,
      conversionRate: latest.totalRequests > 0
        ? ((latest.closedRequests / latest.totalRequests) * 100).toFixed(1)
        : '0',
    };

    return { snapshots, summary };
  }

  async getDashboardOverview() {
    const [latestMetric, moderationLogs] = await Promise.all([
      this.prisma.metricSnapshot.findFirst({ orderBy: { date: 'desc' } }),
      this.prisma.moderationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      metrics: latestMetric,
      recentModerations: moderationLogs,
    };
  }
}
