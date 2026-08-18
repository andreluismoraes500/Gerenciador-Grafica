// backend/src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = await dashboardService.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('[Dashboard] Erro em getMetrics:', error);
      res.status(500).json({ message: 'Erro ao buscar métricas do dashboard' });
    }
  },

  async getRevenue(req: Request, res: Response) {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const revenue = await dashboardService.getMonthlyRevenue(months);
      res.json(revenue);
    } catch (error) {
      console.error('[Dashboard] Erro em getRevenue:', error);
      res.status(500).json({ message: 'Erro ao buscar faturamento mensal' });
    }
  },

  async getTopProducts(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 30;
      const products = await dashboardService.getTopProducts(limit, days);
      res.json(products);
    } catch (error) {
      console.error('[Dashboard] Erro em getTopProducts:', error);
      res.status(500).json({ message: 'Erro ao buscar produtos mais vendidos' });
    }
  },

  async getStatusDistribution(req: Request, res: Response) {
    try {
      const distribution = await dashboardService.getStatusDistribution();
      res.json(distribution);
    } catch (error) {
      console.error('[Dashboard] Erro em getStatusDistribution:', error);
      res.status(500).json({ message: 'Erro ao buscar distribuição de status' });
    }
  },

  async getRecentActivities(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await dashboardService.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error('[Dashboard] Erro em getRecentActivities:', error);
      res.status(500).json({ message: 'Erro ao buscar atividades recentes' });
    }
  },

  async getUpcomingDeliveries(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const deliveries = await dashboardService.getUpcomingDeliveries(days);
      res.json(deliveries);
    } catch (error) {
      console.error('[Dashboard] Erro em getUpcomingDeliveries:', error);
      res.status(500).json({ message: 'Erro ao buscar entregas próximas' });
    }
  },

  async getLowStockAlerts(req: Request, res: Response) {
    try {
      const alerts = await dashboardService.getLowStockAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('[Dashboard] Erro em getLowStockAlerts:', error);
      res.status(500).json({ message: 'Erro ao buscar alertas de estoque' });
    }
  },

  async getAdvancedMetrics(req: Request, res: Response) {
    try {
      const metrics = await dashboardService.getAdvancedMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('[Dashboard] Erro em getAdvancedMetrics:', error);
      res.status(500).json({ message: 'Erro ao buscar métricas avançadas' });
    }
  },

  async getQuickStats(req: Request, res: Response) {
    try {
      const stats = await dashboardService.getQuickStats();
      res.json(stats);
    } catch (error) {
      console.error('[Dashboard] Erro em getQuickStats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas rápidas' });
    }
  },
};
