import { Response, NextFunction } from 'express';
import { notificationsService } from '../services/notification.service';
import { AuthRequest } from '../middlewares/auth';

export const notificationsController = {
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationsService.markAsRead(req.params.id, req.user!.id);
      res.json(notification);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationsService.delete(req.params.id, req.user!.id);
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