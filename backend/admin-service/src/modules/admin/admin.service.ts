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

  async recordSnapshot(data: {
    totalUsers: number;
    newUsers: number;
    totalAssets: number;
    publishedAssets: number;
    totalRequests: number;
    closedRequests: number;
    totalViews: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.metricSnapshot.upsert({
      where: { date: today },
      update: data,
      create: { date: today, ...data },
    });
  }

  async getMetrics(range: '7d' | '30d' | '90d' | '365d' = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range];
    const since = new Date();
    since.setDate(since.getDate() - days);

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
