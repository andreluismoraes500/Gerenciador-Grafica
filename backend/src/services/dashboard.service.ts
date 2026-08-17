// backend/src/services/dashboard.service.ts
import { prisma } from '../config/database';
import { startOfMonth, subDays, subMonths, endOfDay, format } from 'date-fns';

export const dashboardService = {
  /**
   * Métricas principais do dashboard
   */
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
          status: { in: ['CREATING', 'AWAITING_APPROVAL', 'PRODUCTION'] },
        },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: monthStart, lte: endOfDay(now) },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: lastMonthStart, lt: monthStart },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: 'BUDGET' } }),
    ]);

    const currentRevenue = Number(monthRevenue._sum.total) || 0;
    const previousRevenue = Number(lastMonthRevenue._sum.total) || 0;

    let revenueDelta = 0;
    if (previousRevenue > 0) {
      revenueDelta = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (currentRevenue > 0) {
      revenueDelta = 100;
    }

    return {
      totalOrders: Number(totalOrders) || 0,
      activeClients: Number(activeClients) || 0,
      inProgressProjects: Number(inProgressProjects) || 0,
      monthRevenue: currentRevenue,
      lastMonthRevenue: previousRevenue,
      revenueDelta,
      pendingOrders: Number(pendingOrders) || 0,
    };
  },

  /**
   * Faturamento mensal para o gráfico
   *
   * 🔥 CORREÇÃO: antes usava prisma.$queryRaw com DATE_TRUNC recebendo um
   * objeto Date do JS interpolado no template — isso falha silenciosamente
   * em alguns setups de Postgres/Prisma (erro de bind de tipo), cai no
   * catch e retorna tudo zerado, mesmo havendo pedidos pagos no banco
   * (por isso o card de faturamento mostrava valor, mas o gráfico não).
   *
   * Trocado por uma busca simples com Prisma ORM + agrupamento em JS,
   * que é mais robusto e não depende de SQL cru.
   */
  async getMonthlyRevenue(months = 12) {
    const now = new Date();
    const startDate = subMonths(startOfMonth(now), months - 1);

    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        paidAt: { gte: startDate, lte: endOfDay(now) },
      },
      select: { paidAt: true, total: true },
    });

    // Agrupar por mês (yyyy-MM-01) em JS
    const monthMap = new Map<string, { total: number; orders: number }>();
    for (const order of paidOrders) {
      if (!order.paidAt) continue;
      const key = format(startOfMonth(order.paidAt), 'yyyy-MM-dd');
      const current = monthMap.get(key) || { total: 0, orders: 0 };
      current.total += Number(order.total) || 0;
      current.orders += 1;
      monthMap.set(key, current);
    }

    return this.fillMissingMonths(
      Array.from(monthMap.entries()).map(([month, v]) => ({
        month,
        total: v.total,
        orders: v.orders,
      })),
      months,
      now,
    );
  },

  /**
   * Preenche meses sem dados de faturamento
   */
  fillMissingMonths(data: any[], months: number, now: Date) {
    const result: any[] = [];
    const monthMap = new Map();

    data.forEach((item) => {
      let date = item.month;
      if (typeof date === 'string') {
        date = new Date(date);
      }
      const key = format(date, 'yyyy-MM-dd');
      monthMap.set(key, {
        month: key,
        total: Number(item.total) || 0,
        orders: Number(item.orders) || 0,
      });
    });

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(startOfMonth(now), i);
      const key = format(date, 'yyyy-MM-dd');

      if (monthMap.has(key)) {
        result.push(monthMap.get(key));
      } else {
        result.push({ month: key, total: 0, orders: 0 });
      }
    }

    return result;
  },

  /**
   * Top produtos mais vendidos
   */
  async getTopProducts(limit = 10, days = 30) {
    const since = subDays(new Date(), days);

    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          paidAt: { gte: since },
          paymentStatus: 'PAID',
        },
      },
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return grouped.map((g) => ({
      productId: g.productId,
      product: productMap.get(g.productId) || null,
      _sum: g._sum,
      _count: g._count,
    }));
  },

  /**
   * Distribuição de status dos pedidos
   */
  async getStatusDistribution() {
    const results = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((r) => ({
      status: r.status,
      _count: r._count,
    }));
  },

  /**
   * Atividades recentes do sistema
   */
  async getRecentActivities(limit = 20) {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  },

  /**
   * Entregas previstas para os próximos dias
   */
  async getUpcomingDeliveries(days = 7) {
    const now = new Date();
    const limitDate = new Date(now.getTime() + days * 86400000);

    return prisma.order.findMany({
      where: {
        dueDate: { gte: now, lte: limitDate },
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  /**
   * Alertas de estoque baixo (produtos)
   */
  async getLowStockAlerts() {
    return prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: prisma.product.fields.minStock },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minStock: true,
      },
      orderBy: { stock: 'asc' },
      take: 20,
    });
  },

  /**
   * Métricas avançadas para o dashboard
   */
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
      lowStockCount,
      totalProducts,
      totalSuppliers,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: monthStart, lte: endOfDay(now) },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: yearStart, lte: endOfDay(now) },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.project.count({
        where: {
          status: { in: ['CREATING', 'AWAITING_APPROVAL', 'PRODUCTION'] },
        },
      }),
      prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      prisma.client.count(),
      prisma.product.count({
        where: {
          isActive: true,
          stock: { lte: prisma.product.fields.minStock },
        },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: true } }),
    ]);

    const monthlyGrowth = await this.getMonthlyGrowth();

    return {
      orders: {
        total: Number(totalOrders) || 0,
        totalRevenue: Number(totalRevenue._sum.total) || 0,
        monthRevenue: Number(monthRevenue._sum.total) || 0,
        yearRevenue: Number(yearRevenue._sum.total) || 0,
      },
      projects: {
        active: Number(activeProjects) || 0,
      },
      tasks: {
        pending: Number(pendingTasks) || 0,
      },
      clients: {
        total: Number(totalClients) || 0,
      },
      products: {
        total: Number(totalProducts) || 0,
        lowStock: Number(lowStockCount) || 0,
      },
      suppliers: {
        total: Number(totalSuppliers) || 0,
      },
      growth: {
        monthly: monthlyGrowth,
      },
    };
  },

  /**
   * Calcula crescimento mensal do faturamento
   */
  async getMonthlyGrowth() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [currentMonth, lastMonth] = await Promise.all([
      prisma.order.aggregate({
        where: {
          paidAt: { gte: monthStart, lte: endOfDay(now) },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
    ]);

    const current = Number(currentMonth._sum.total) || 0;
    const previous = Number(lastMonth._sum.total) || 0;

    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  },

  /**
   * Estatísticas rápidas para o header do dashboard
   */
  async getQuickStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const [ordersToday, ordersThisWeek, revenueToday, newClientsToday] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: weekStart } },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: today },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.client.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    return {
      ordersToday: Number(ordersToday) || 0,
      ordersThisWeek: Number(ordersThisWeek) || 0,
      revenueToday: Number(revenueToday._sum.total) || 0,
      newClientsToday: Number(newClientsToday) || 0,
    };
  },
};