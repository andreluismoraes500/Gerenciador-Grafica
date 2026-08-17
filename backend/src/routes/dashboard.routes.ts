// backend/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireRole } from '../middlewares/auth';

export const dashboardRoutes = Router();

// Rotas do dashboard
dashboardRoutes.get('/metrics', dashboardController.getMetrics);
dashboardRoutes.get('/revenue', dashboardController.getRevenue);
dashboardRoutes.get('/top-products', dashboardController.getTopProducts);
dashboardRoutes.get('/status-distribution', dashboardController.getStatusDistribution);
dashboardRoutes.get('/recent-activities', dashboardController.getRecentActivities);
dashboardRoutes.get('/upcoming-deliveries', dashboardController.getUpcomingDeliveries);

// Rotas com permissões específicas
dashboardRoutes.get('/low-stock-alerts', requireRole('ADMIN', 'ATTENDANT'), dashboardController.getLowStockAlerts);
dashboardRoutes.get('/advanced-metrics', requireRole('ADMIN'), dashboardController.getAdvancedMetrics);
dashboardRoutes.get('/quick-stats', dashboardController.getQuickStats);