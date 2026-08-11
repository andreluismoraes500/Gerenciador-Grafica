import { Request, Response, NextFunction } from 'express';
import { ordersService } from '../services/orders.service';
import { AuthRequest } from '../middlewares/auth';
import { createOrderSchema } from '../validators/order.validator';

export const ordersController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status, search, from, to } = req.query;
      const result = await ordersService.list({
        page: +page, limit: +limit, status: status as any, search: search as string,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        userId: req.user!.id, role: req.user!.role
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await ordersService.getById(req.params.id)); } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createOrderSchema.parse(req.body);
      const order = await ordersService.create(data, req.user!.id);
      req.app.get('io')?.to(`user:${req.user!.id}`).emit('order:created', order);
      res.status(201).json(order);
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const order = await ordersService.updateStatus(req.params.id, status, req.user!.id);
      req.app.get('io')?.to(`user:${order.clientId}`).emit('order:status-changed', order);
      res.json(order);
    } catch (e) { next(e); }
  }
};