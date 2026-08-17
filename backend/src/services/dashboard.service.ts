// backend/src/services/dashboard.service.ts
import { prisma } from '../config/database';
import { startOfMonth, subDays, subMonths, endOfDay, format } from 'date-fns';

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
      prisma.project.count({ 
        where: { 
          status: { in: ['CREATING', 'AWAITING_APPROVAL', 'PRODUCTION'] } 
        } 
      }),
      
      // ✅ Usar paidAt em vez de createdAt
      prisma.order.aggregate({ 
        where: { 
          paidAt: { gte: monthStart, lte: endOfDay(now) }, 
          paymentStatus: 'PAID' 
        }, 
        _sum: { total: true } 
      }),
      
      prisma.order.aggregate({ 
        where: { 
          paidAt: { gte: lastMonthStart, lt: monthStart }, 
          paymentStatus: 'PAID' 
        }, 
        _sum: { total: true } 
      }),
      
      prisma.order.count({ where: { status: 'BUDGET' } }),
    ]);

    return {
      totalOrders,
      activeClients,
      inProgressProjects,
      monthRevenue: monthRevenue._sum.total || 0,
      lastMonthRevenue: lastMonthRevenue._sum.total || 0,
      revenueDelta: monthRevenue._sum.total != null && lastMonthRevenue._sum.total != null
        ? ((monthRevenue._sum.total - lastMonthRevenue._sum.total) / lastMonthRevenue._sum.total) * 100
        : (monthRevenue._sum.total ?? 0) > 0 ? 100 : 0,
      pendingOrders,
    };
  },

  async getMonthlyRevenue(months = 12) {
    try {
      const now = new Date();
      const startDate = subMonths(startOfMonth(now), months - 1);
      
      // 🔧 CORREÇÃO: Buscar dados do banco com paidAt
      // Usando Prisma diretamente em vez de SQL raw para evitar problemas de fuso
      const results = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "paidAt") as month,
          COALESCE(SUM(total), 0)::float as total,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE "paymentStatus" = 'PAID' 
          AND "paidAt" IS NOT NULL
          AND "paidAt" >= ${startDate}
          AND "paidAt" <= ${endOfDay(now)}
        GROUP BY DATE_TRUNC('month', "paidAt")
        ORDER BY month ASC;
      `;
      
      console.log('[Dashboard] Raw results:', results);
      
      // Preencher meses vazios
      const filledResults = this.fillMissingMonths(results as any[], months, now);
      
      console.log('[Dashboard] Filled results:', filledResults);
      
      return filledResults;
    } catch (error) {
      console.error('[Dashboard] Erro no getMonthlyRevenue:', error);
      // Fallback: retorna dados vazios
      return this.generateEmptyMonthlyData(months, new Date());
    }
  },

  // Fallback para quando a query falha
  generateEmptyMonthlyData(months: number, now: Date) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(startOfMonth(now), i);
      result.push({
        month: format(date, 'yyyy-MM-dd'),
        total: 0,
        orders: 0
      });
    }
    return result;
  },

  fillMissingMonths(data: any[], months: number, now: Date) {
    const result: any[] = [];
    const monthMap = new Map();
    
    data.forEach(item => {
      const date = item.month instanceof Date ? item.month : new Date(item.month);
      const key = format(date, 'yyyy-MM-dd');
      monthMap.set(key, {
        month: key,
        total: Number(item.total) || 0,
        orders: Number(item.orders) || 0
      });
    });
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(startOfMonth(now), i);
      const key = format(date, 'yyyy-MM-dd');
      
      if (monthMap.has(key)) {
        result.push(monthMap.get(key));
      } else {
        result.push({
          month: key,
          total: 0,
          orders: 0
        });
      }
    }
    
    return result;
  },

  async getTopProducts(limit = 10, days = 30) {
    const since = subDays(new Date(), days);

    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          paidAt: { gte: since },
          paymentStatus: 'PAID'
        }
      },
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit
    });

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
    const results = await prisma.order.groupBy({ 
      by: ['status'], 
      _count: true 
    });
    return results.sort((a, b) => a.status.localeCompare(b.status));
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
      where: { 
        dueDate: { gte: now, lte: limitDate }, 
        status: { notIn: ['DELIVERED', 'CANCELLED'] } 
      },
      include: { client: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  async getLowStockAlerts() {
    const products = await prisma.product.findMany({ 
      where: { isActive: true } 
    });
    return products.filter(p => p.stock <= p.minStock);
  },

  async getAdvancedMetrics() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

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
          paidAt: { gte: monthStart, lte: endOfDay(now) },
          paymentStatus: 'PAID' 
        },
        _sum: { total: true }
      }),
      prisma.order.aggregate({
        where: { 
          paidAt: { gte: yearStart, lte: endOfDay(now) },
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

  async getMonthlyGrowth() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [currentMonth, lastMonth] = await Promise.all([
      prisma.order.aggregate({
        where: { 
          paidAt: { gte: monthStart, lte: endOfDay(now) },
          paymentStatus: 'PAID' 
        },
        _sum: { total: true }
      }),
      prisma.order.aggregate({
        where: { 
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
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