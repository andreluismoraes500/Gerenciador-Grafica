import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireRole } from '../middlewares/auth';

export const dashboardRoutes = Router();

dashboardRoutes.get('/metrics', dashboardController.getMetrics);
dashboardRoutes.get('/revenue', dashboardController.getRevenue);
dashboardRoutes.get('/top-products', dashboardController.getTopProducts);
dashboardRoutes.get('/status-distribution', dashboardController.getStatusDistribution);
dashboardRoutes.get('/recent-activities', dashboardController.getRecentActivities);
dashboardRoutes.get('/upcoming-deliveries', dashboardController.getUpcomingDeliveries);
dashboardRoutes.get('/low-stock-alerts', requireRole('ADMIN', 'ATTENDANT'), dashboardController.getLowStockAlerts);