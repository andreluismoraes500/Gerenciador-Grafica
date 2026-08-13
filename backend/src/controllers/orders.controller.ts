import { Request, Response, NextFunction } from 'express';
import { ordersService } from '../services/orders.service';
import { notificationsService } from '../services/notifications.service';
import { AuthRequest } from '../middlewares/auth';
import { createOrderSchema } from '../validators/order.validator';
import { logActivity } from '../services/activity.service';

const getRouteParamId = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value ?? '';

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
    try { res.json(await ordersService.getById(getRouteParamId(req.params.id))); } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createOrderSchema.parse(req.body);
      const order = await ordersService.create(data, req.user!.id);
      await logActivity(req.user!.id, 'CREATE_ORDER', 'Order', order.id, { code: order.code });

      // 🔔 Notificação: avisa a equipe sobre novo pedido
      await notificationsService.notifyTeam(req.user!.id, {
        title: 'Novo pedido criado',
        message: `Pedido ${order.code} — ${order.client?.name || ''} — R$ ${order.total.toFixed(2)}`,
        type: 'SUCCESS',
        metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
      });

      // 🔔 Notificação: também avisa o cliente (se ele tiver login)
      if (order.client?.userId) {
        await notificationsService.create(order.client.userId, {
          title: 'Seu pedido foi registrado',
          message: `Pedido ${order.code} no valor de R$ ${order.total.toFixed(2)} foi recebido.`,
          type: 'INFO',
          metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
        });
      }

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

      // 🔔 Notificação: avisa o cliente quando o status muda
      const statusLabels: Record<string, string> = {
        BUDGET: 'em orçamento',
        CONFIRMED: 'confirmado',
        IN_PRODUCTION: 'em produção',
        READY: 'pronto para retirada',
        DELIVERED: 'entregue',
        CANCELLED: 'cancelado',
      };

      if (order.client?.userId) {
        await notificationsService.create(order.client.userId, {
          title: 'Atualização no seu pedido',
          message: `Pedido ${order.code} agora está ${statusLabels[status] || status}.`,
          type: status === 'CANCELLED' ? 'WARNING' : 'INFO',
          metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
        });
      }

      req.app.get('io')?.to(`user:${order.clientId}`).emit('order:status-changed', order);
      res.json(order);
    } catch (e) { next(e); }
  },

  async updatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentStatus } = req.body;
      const order = await ordersService.updatePaymentStatus(getRouteParamId(req.params.id), paymentStatus);

      // 🔔 Notificação: avisa equipe sobre pagamento
      if (paymentStatus === 'PAID') {
        await notificationsService.notifyTeam(req.user!.id, {
          title: 'Pagamento confirmado',
          message: `Pedido ${order.code} foi pago — R$ ${order.total.toFixed(2)}`,
          type: 'SUCCESS',
          metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
        });
      } else if (paymentStatus === 'REFUNDED') {
        await notificationsService.notifyTeam(req.user!.id, {
          title: 'Reembolso realizado',
          message: `Pedido ${order.code} teve reembolso processado.`,
          type: 'WARNING',
          metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
        });
      }

      res.json(order);
    } catch (e) { next(e); }
  },

  async getInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await ordersService.getInvoice(getRouteParamId(req.params.id));
      res.json(invoice);
    } catch (e) { next(e); }
  },

  async createInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await ordersService.createInvoice(getRouteParamId(req.params.id));
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