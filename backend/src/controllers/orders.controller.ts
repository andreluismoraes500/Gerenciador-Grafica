import { Request, Response, NextFunction } from 'express';
import { ordersService } from '../services/orders.service';
import { AuthRequest } from '../middlewares/auth';
import { createOrderSchema } from '../validators/order.validator';
import { logActivity } from '../services/activity.service';

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
      await logActivity(req.user!.id, 'CREATE_ORDER', 'Order', order.id, { code: order.code });
      req.app.get('io')?.to(`user:${req.user!.id}`).emit('order:created', order);
      res.status(201).json(order);
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.update(req.params.id, req.body, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_ORDER', 'Order', order.id, { code: order.code });
      res.json(order);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await ordersService.delete(req.params.id, req.user!.id);
      await logActivity(req.user!.id, 'DELETE_ORDER', 'Order', req.params.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const order = await ordersService.updateStatus(req.params.id, status, req.user!.id);
      req.app.get('io')?.to(`user:${order.clientId}`).emit('order:status-changed', order);
      res.json(order);
    } catch (e) { next(e); }
  },

  async updatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentStatus } = req.body;
      const order = await ordersService.updatePaymentStatus(req.params.id, paymentStatus);
      res.json(order);
    } catch (e) { next(e); }
  },

  async getInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await ordersService.getInvoice(req.params.id);
      res.json(invoice);
    } catch (e) { next(e); }
  },

  async createInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await ordersService.createInvoice(req.params.id);
      res.status(201).json(invoice);
    } catch (e) { next(e); }
  },

  async getMonthlyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await ordersService.getMonthlyStats();
      res.json(stats);
    } catch (e) { next(e); }
  }
};
