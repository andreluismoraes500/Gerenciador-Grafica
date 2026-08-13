import { Response, NextFunction } from 'express';
import { quotesService } from '../services/quotes.service';
import { notificationsService } from '../services/notifications.service';
import { AuthRequest } from '../middlewares/auth';
import { createQuoteSchema, updateQuoteSchema } from '../validators/quote.validator';
import { logActivity } from '../services/activity.service';

const getParamId = (req: AuthRequest): string => {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] ?? '' : id ?? '';
};

export const quotesController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status, clientId } = req.query;
      const result = await quotesService.list({
        page: +page, limit: +limit, status: status as string, clientId: clientId as string
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await quotesService.getById(getParamId(req))); } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createQuoteSchema.parse(req.body);
      const quote = await quotesService.create(data);
      await logActivity(req.user!.id, 'CREATE_QUOTE', 'Quote', quote.id, { number: quote.number });
      res.status(201).json(quote);
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateQuoteSchema.parse(req.body);
      const quote = await quotesService.update(getParamId(req), data);
      res.json(quote);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await quotesService.delete(getParamId(req));
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const quote = await quotesService.updateStatus(getParamId(req), status);
      res.json(quote);
    } catch (e) { next(e); }
  },

  async generatePDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quoteId = getParamId(req);
      const pdf = await quotesService.generatePDF(quoteId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="orcamento-${quoteId}.pdf"`);
      res.send(pdf);
    } catch (e) { next(e); }
  },

  async sendByEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { to } = req.body;
      await quotesService.sendByEmail(getParamId(req), to);
      res.json({ message: 'Quote sent successfully' });
    } catch (e) { next(e); }
  },

  async convertToOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentMethod } = req.body;
      const order = await quotesService.convertToOrder(getParamId(req), req.user!.id, paymentMethod);

      // 🔔 Notificação: avisa equipe que orçamento virou pedido
      await notificationsService.notifyTeam(req.user!.id, {
        title: 'Orçamento convertido em pedido',
        message: `Pedido ${order.code} gerado a partir do orçamento — R$ ${order.total.toFixed(2)}`,
        type: 'SUCCESS',
        metadata: { entity: 'Order', entityId: order.id, route: '/orders' },
      });

      res.status(201).json(order);
    } catch (e) { next(e); }
  },
};
