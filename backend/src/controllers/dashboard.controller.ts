// backend/src/controllers/dashboard.controller.ts
import { Response, NextFunction } from 'express';
import { format } from 'date-fns';
import { dashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middlewares/auth';

export const dashboardController = {
  /**
   * Métricas principais do dashboard
   */
  async getMetrics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await dashboardService.getMetrics();
      res.json(metrics);
    } catch (e) { 
      console.error('[Dashboard] Erro em getMetrics:', e);
      next(e); 
    }
  },

  /**
   * Dados de faturamento mensal para o gráfico
   */
  async getRevenue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const revenue = await dashboardService.getMonthlyRevenue(months);
      
      // Formatar os dados para o frontend
      const formattedRevenue = revenue.map((item: any) => {
        let monthStr = item.month;
        if (item.month instanceof Date) {
          monthStr = format(item.month, 'yyyy-MM-dd');
        } else if (typeof item.month === 'string' && item.month.includes('T')) {
          monthStr = item.month.split('T')[0];
        }
        
        return {
          month: monthStr,
          total: Number(item.total) || 0,
          orders: Number(item.orders) || 0
        };
      });
      
      res.json(formattedRevenue);
    } catch (e) { 
      console.error('[Dashboard] Erro em getRevenue:', e);
      next(e); 
    }
  },

  /**
   * Top produtos mais vendidos
   */
  async getTopProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 30;
      const products = await dashboardService.getTopProducts(limit, days);
      res.json(products);
    } catch (e) { 
      console.error('[Dashboard] Erro em getTopProducts:', e);
      next(e); 
    }
  },

  /**
   * Distribuição de status dos pedidos
   */
  async getStatusDistribution(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const distribution = await dashboardService.getStatusDistribution();
      res.json(distribution);
    } catch (e) { 
      console.error('[Dashboard] Erro em getStatusDistribution:', e);
      next(e); 
    }
  },

  /**
   * Atividades recentes
   */
  async getRecentActivities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await dashboardService.getRecentActivities(limit);
      res.json(activities);
    } catch (e) { 
      console.error('[Dashboard] Erro em getRecentActivities:', e);
      next(e); 
    }
  },

  /**
   * Entregas previstas
   */
  async getUpcomingDeliveries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const deliveries = await dashboardService.getUpcomingDeliveries(days);
      res.json(deliveries);
    } catch (e) { 
      console.error('[Dashboard] Erro em getUpcomingDeliveries:', e);
      next(e); 
    }
  },

  /**
   * Alertas de estoque baixo
   */
  async getLowStockAlerts(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const alerts = await dashboardService.getLowStockAlerts();
      res.json(alerts);
    } catch (e) { 
      console.error('[Dashboard] Erro em getLowStockAlerts:', e);
      next(e); 
    }
  },

  /**
   * Métricas avançadas (detalhadas)
   */
  async getAdvancedMetrics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await dashboardService.getAdvancedMetrics();
      res.json(metrics);
    } catch (e) { 
      console.error('[Dashboard] Erro em getAdvancedMetrics:', e);
      next(e); 
    }
  },

  /**
   * Estatísticas rápidas (hoje, semana)
   */
  async getQuickStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getQuickStats();
      res.json(stats);
    } catch (e) { 
      console.error('[Dashboard] Erro em getQuickStats:', e);
      next(e); 
    }
  }
};