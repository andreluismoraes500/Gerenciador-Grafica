import { Response, NextFunction } from 'express';
import { notificationsService } from '../services/notifications.service';
import { AuthRequest } from '../middlewares/auth';

export const notificationsController = {
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notification = await notificationsService.markAsRead(notificationId, req.user!.id);
      res.json(notification);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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