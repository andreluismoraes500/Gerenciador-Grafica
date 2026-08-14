import { prisma } from '../config/database';
import { startOfMonth, subDays, subMonths } from 'date-fns';

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
      SELECT DATE_TRUNC('month', "createdAt") as month,
             COALESCE(SUM(total), 0)::float as total,
             COUNT(*)::int as orders
      FROM "Order"
      WHERE "paymentStatus" = 'PAID' AND "createdAt" >= NOW() - INTERVAL '${months} months'
      GROUP BY month ORDER BY month;
    `);
    return results;
},

   async getTopProducts(limit = 10, days = 30) {
    const since = subDays(new Date(), days);

    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: since },
          paymentStatus: 'PAID'
        }
      },
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit
    });

    // Busca os produtos para incluir nome/sku
    const productIds = grouped.map(g => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    return grouped.map(g => ({
      productId: g.productId,
      product: productMap.get(g.productId) || null,
      _sum: g._sum,
      _count: g._count,
    }));
  },

  async getStatusDistribution() {
    return prisma.order.groupBy({ by: ['status'], _count: true });
  },

  async getRecentActivities(limit = 20) {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  },

  async getUpcomingDeliveries(days = 7) {
    const now = new Date();
    const limitDate = new Date(now.getTime() + days * 86400000);
    return prisma.order.findMany({
      where: { dueDate: { gte: now, lte: limitDate }, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      include: { client: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  async getLowStockAlerts() {
    const products = await prisma.product.findMany({ where: { isActive: true } });
    return products.filter(p => p.stock <= p.minStock);
  },

  async getAdvancedMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalOrders,
    totalRevenue,
    monthRevenue,
    yearRevenue,
    activeProjects,
    pendingTasks,
    totalClients,
    lowStockCount
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { total: true }
    }),
    prisma.order.aggregate({
      where: { 
        createdAt: { gte: startOfMonth },
        paymentStatus: 'PAID' 
      },
      _sum: { total: true }
    }),
    prisma.order.aggregate({
      where: { 
        createdAt: { gte: startOfYear },
        paymentStatus: 'PAID' 
      },
      _sum: { total: true }
    }),
    prisma.project.count({
      where: { 
        status: { in: ['CREATING', 'AWAITING_APPROVAL', 'PRODUCTION'] }
      }
    }),
    prisma.task.count({
      where: { 
        status: { in: ['TODO', 'IN_PROGRESS'] }
      }
    }),
    prisma.client.count(),
    prisma.product.count({
      where: {
        isActive: true,
        stock: { lte: prisma.product.fields.minStock }
      }
    })
  ]);

  return {
    orders: {
      total: totalOrders,
      month: monthRevenue._sum.total || 0,
      year: yearRevenue._sum.total || 0,
      totalRevenue: totalRevenue._sum.total || 0,
    },
    projects: {
      active: activeProjects,
    },
    tasks: {
      pending: pendingTasks,
    },
    clients: {
      total: totalClients,
    },
    stock: {
      lowStock: lowStockCount,
    },
    growth: {
      monthly: await this.getMonthlyGrowth(),
    }
  };
},

/**
 * Calcula crescimento mensal
 */
async getMonthlyGrowth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [currentMonth, lastMonth] = await Promise.all([
    prisma.order.aggregate({
      where: { 
        createdAt: { gte: startOfMonth },
        paymentStatus: 'PAID' 
      },
      _sum: { total: true }
    }),
    prisma.order.aggregate({
      where: { 
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        paymentStatus: 'PAID' 
      },
      _sum: { total: true }
    })
  ]);

  const current = currentMonth._sum.total || 0;
  const previous = lastMonth._sum.total || 0;

  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
};

