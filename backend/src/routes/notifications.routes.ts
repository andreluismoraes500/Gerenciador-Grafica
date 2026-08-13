import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { authMiddleware } from '../middlewares/auth';

export const notificationsRoutes = Router();

notificationsRoutes.get('/', authMiddleware, notificationsController.list);
notificationsRoutes.patch('/:id/read', authMiddleware, notificationsController.markAsRead);
notificationsRoutes.delete('/:id', authMiddleware, notificationsController.delete);
notificationsRoutes.delete('/', authMiddleware, notificationsController.deleteAll);