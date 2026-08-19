// backend/src/controllers/orders.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ordersService } from '../services/orders.service';
import { notificationsService } from '../services/notifications.service';
import { AuthRequest } from '../middlewares/auth';
import { createOrderSchema } from '../validators/order.validator';
import { logActivity } from '../services/activity.service';

export const ordersController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status, search, from, to } = req.query;
      const result = await ordersService.list({
        page: +page,
        limit: +limit,
        status: status as any,
        search: search as string,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        userId: req.user!.id,
        role: req.user!.role
      });
      res.json(result);
    } catch (e) {
      console.error('[orders.controller] list error:', e);
      next(e);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.getById(req.params.id);
      res.json(order);
    } catch (e) {
      console.error('[orders.controller] getById error:', e);
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createOrderSchema.parse(req.body);
      console.log('[orders.controller] create - data:', data);

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
    } catch (e) {
      console.error('[orders.controller] create error:', e);
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.update(req.params.id, req.body);

      await logActivity(req.user!.id, 'UPDATE_ORDER', 'Order', order.id, { code: order.code });

      res.json(order);
    } catch (e) {
      console.error('[orders.controller] update error:', e);
      next(e);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await ordersService.delete(req.params.id, req.user!.id);

      await logActivity(req.user!.id, 'DELETE_ORDER', 'Order', req.params.id);

      res.status(204).send();
    } catch (e) {
      console.error('[orders.controller] delete error:', e);
      next(e);
    }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status é obrigatório' });
      }

      console.log('[orders.controller] updateStatus - orderId:', req.params.id, 'status:', status);

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
    } catch (e) {
      console.error('[orders.controller] updateStatus error:', e);
      next(e);
    }
  },

  async updatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentStatus } = req.body;

      if (!paymentStatus) {
        return res.status(400).json({ error: 'Status de pagamento é obrigatório' });
      }

      const validStatuses = ['PENDING', 'PAID', 'REFUNDED', 'CANCELLED'];
      if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          error: `Status de pagamento inválido. Use: ${validStatuses.join(', ')}`
        });
      }

      console.log('[orders.controller] updatePaymentStatus - orderId:', req.params.id, 'paymentStatus:', paymentStatus);

      const order = await ordersService.updatePaymentStatus(req.params.id, paymentStatus);

      // 🔔 Notificação: avisa equipe sobre pagamento
      if (paymentStatus === 'PAID') {
        await notificationsService.notifyTeam(req.user!.id, {
          title: '💳 Pagamento confirmado',
          message: `Pedido ${order.code} foi pago — R$ ${order.total.toFixed(2)}`,
          type: 'SUCCESS',
          metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
        });

        // Avisa o cliente também
        if (order.client?.userId) {
          await notificationsService.create(order.client.userId, {
            title: 'Pagamento confirmado',
            message: `Seu pedido ${order.code} foi pago com sucesso.`,
            type: 'SUCCESS',
            metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
          });
        }
      } else if (paymentStatus === 'REFUNDED') {
        await notificationsService.notifyTeam(req.user!.id, {
          title: '🔄 Reembolso realizado',
          message: `Pedido ${order.code} teve reembolso processado.`,
          type: 'WARNING',
          metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
        });

        if (order.client?.userId) {
          await notificationsService.create(order.client.userId, {
            title: 'Reembolso processado',
            message: `Seu pedido ${order.code} foi reembolsado.`,
            type: 'WARNING',
            metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
          });
        }
      }

      req.app.get('io')?.emit('order:payment-updated', order);

      res.json(order);
    } catch (e) {
      console.error('[orders.controller] updatePaymentStatus error:', e);
      next(e);
    }
  },

  async getInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await ordersService.getInvoice(req.params.id);
      res.json(invoice);
    } catch (e) {
      console.error('[orders.controller] getInvoice error:', e);
      next(e);
    }
  },

  async createInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = await ordersService.createInvoice(req.params.id);
      res.status(201).json(invoice);
    } catch (e) {
      console.error('[orders.controller] createInvoice error:', e);
      next(e);
    }
  },

  async getMonthlyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await ordersService.getMonthlyStats();
      res.json(stats);
    } catch (e) {
      console.error('[orders.controller] getMonthlyStats error:', e);
      next(e);
    }
  }
};