import { Response, NextFunction } from 'express';
import { quotesService } from '../services/quotes.service';
import { AuthRequest } from '../middlewares/auth';
import { createQuoteSchema, updateQuoteSchema } from '../validators/quote.validator';
import { logActivity } from '../services/activity.service';

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
    try { res.json(await quotesService.getById(req.params.id)); } catch (e) { next(e); }
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
      const quote = await quotesService.update(req.params.id, data);
      res.json(quote);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await quotesService.delete(req.params.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const quote = await quotesService.updateStatus(req.params.id, status);
      res.json(quote);
    } catch (e) { next(e); }
  },

  async generatePDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pdf = await quotesService.generatePDF(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="orcamento-${req.params.id}.pdf"`);
      res.send(pdf);
    } catch (e) { next(e); }
  },

  async sendByEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { to } = req.body;
      await quotesService.sendByEmail(req.params.id, to);
      res.json({ message: 'Quote sent successfully' });
    } catch (e) { next(e); }
  },

  async convertToOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentMethod } = req.body;
      const order = await quotesService.convertToOrder(req.params.id, req.user!.id, paymentMethod);
      res.status(201).json(order);
    } catch (e) { next(e); }
  }
};
