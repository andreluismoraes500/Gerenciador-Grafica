import { Response, NextFunction } from 'express';
import { notificationsService } from '../services/notifications.service';
import { AuthRequest } from '../middlewares/auth';

const getParamId = (value: string | string[] | undefined): string => {
  return Array.isArray(value) ? value[0] : value ?? '';
};

export const notificationsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await (notificationsService as any).list(req.user!.id, limit);
      res.json(notifications);
    } catch (e) { next(e); }
  },

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notificationId = getParamId(req.params.id);
      const notification = await notificationsService.markAsRead(notificationId, req.user!.id);
      res.json(notification);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notificationId = getParamId(req.params.id);
      await notificationsService.delete(notificationId, req.user!.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async deleteAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationsService.deleteAll(req.user!.id);
      res.status(204).send();
    } catch (e) { next(e); }
  }
};