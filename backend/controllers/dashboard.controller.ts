import { Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middlewares/auth';

export const dashboardController = {
  async getMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await dashboardService.getMetrics();
      res.json(metrics);
    } catch (e) { next(e); }
  },

  async getRevenue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const revenue = await dashboardService.getMonthlyRevenue(months);
      res.json(revenue);
    } catch (e) { next(e); }
  },

  async getTopProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = await dashboardService.getTopProducts(limit);
      res.json(products);
    } catch (e) { next(e); }
  },

  async getStatusDistribution(req: AuthRequest, res: Response, next: NextFunction) {
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

  async getLowStockAlerts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const alerts = await dashboardService.getLowStockAlerts();
      res.json(alerts);
    } catch (e) { next(e); }
  }
};