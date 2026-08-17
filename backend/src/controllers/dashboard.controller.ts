// backend/src/controllers/dashboard.controller.ts
import { Response, NextFunction } from 'express';
import { format } from 'date-fns';
import { dashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middlewares/auth';

export const dashboardController = {
  async getMetrics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await dashboardService.getMetrics();
      res.json(metrics);
    } catch (e) { next(e); }
  },

  async getRevenue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const revenue = await dashboardService.getMonthlyRevenue(months);
      
      // ✅ CORREÇÃO: Garantir que os dados estejam no formato esperado pelo gráfico
      // O gráfico espera: [{ month: "2026-08-01", total: 600, orders: 1 }]
      const formattedRevenue = revenue.map((item: any) => {
        // Se month for um objeto Date, converte para string ISO
        let monthStr = item.month;
        if (item.month instanceof Date) {
          monthStr = format(item.month, 'yyyy-MM-dd');
        } else if (typeof item.month === 'string' && item.month.includes('T')) {
          // Se for ISO string, extrai apenas a data
          monthStr = item.month.split('T')[0];
        }
        
        return {
          month: monthStr,
          total: Number(item.total) || 0,
          orders: Number(item.orders) || 0
        };
      });
      
      console.log('[Dashboard] Revenue data:', JSON.stringify(formattedRevenue, null, 2));
      res.json(formattedRevenue);
    } catch (e) { 
      console.error('[Dashboard] Erro ao buscar receita:', e);
      next(e); 
    }
  },

  async getTopProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 30;
      const products = await dashboardService.getTopProducts(limit, days);
      res.json(products);
    } catch (e) { next(e); }
  },

  async getStatusDistribution(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const distribution = await dashboardService.getStatusDistribution();
      res.json(distribution);
    } catch (e) { next(e); }
  },

  async getRecentActivities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await dashboardService.getRecentActivities(limit);
      res.json(activities);
    } catch (e) { next(e); }
  },

  async getUpcomingDeliveries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const deliveries = await dashboardService.getUpcomingDeliveries(days);
      res.json(deliveries);
    } catch (e) { next(e); }
  },

  async getLowStockAlerts(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const alerts = await dashboardService.getLowStockAlerts();
      res.json(alerts);
    } catch (e) { next(e); }
  }
};