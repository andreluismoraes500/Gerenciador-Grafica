import { prisma } from '../config/database';
import { startOfMonth, subMonths } from 'date-fns';

export const dashboardService = {
  async getMetrics() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));

    const [
      totalOrders,
      activeClients,
      inProgressProjects,
      monthRevenue,
      lastMonthRevenue,
      pendingOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.client.count(),
      prisma.project.count({ where: { status: { in: ['CREATING', 'AWAITING_APPROVAL', 'PRODUCTION'] } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: monthStart }, paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: lastMonthStart, lt: monthStart }, paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.order.count({ where: { status: 'BUDGET' } }),
    ]);

    return {
      totalOrders,
      activeClients,
      inProgressProjects,
      monthRevenue: monthRevenue._sum.total || 0,
      lastMonthRevenue: lastMonthRevenue._sum.total || 0,
      revenueDelta: monthRevenue._sum.total && lastMonthRevenue._sum.total
        ? ((monthRevenue._sum.total - lastMonthRevenue._sum.total) / lastMonthRevenue._sum.total) * 100
        : 100,
      pendingOrders,
    };
  },

  async getMonthlyRevenue(months = 12) {
    const results = await prisma.$queryRawUnsafe(`
      SELECT DATE_TRUNC('month', "createdAt") as month, SUM(total) as total, COUNT(*) as orders
      FROM "Order"
      WHERE "paymentStatus" = 'PAID' AND "createdAt" >= NOW() - INTERVAL '${months} months'
      GROUP BY month ORDER BY month;
    `);
    return results;
  },

  async getTopProducts(limit = 10) {
    return prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit
    });
  },

  async getStatusDistribution() {
    return prisma.order.groupBy({ by: ['status'], _count: true });
  }
};