import { Response, NextFunction } from 'express';
import { suppliersService } from '../services/suppliers.service';
import { AuthRequest } from '../middlewares/auth';

export const suppliersController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search } = req.query;
      res.json(await suppliersService.list({ page: +page, limit: +limit, search: search as string }));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await suppliersService.getById(req.params.id)); } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await suppliersService.create(req.body)); } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await suppliersService.update(req.params.id, req.body)); } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try { await suppliersService.delete(req.params.id); res.status(204).send(); } catch (e) { next(e); }
  },

  async getPurchases(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await suppliersService.getPurchases(req.params.id)); } catch (e) { next(e); }
  },

  async createPurchase(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await suppliersService.createPurchase(req.params.id, req.body)); } catch (e) { next(e); }
  },

  async markPurchaseAsPaid(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await suppliersService.markPurchaseAsPaid(req.params.purchaseId)); } catch (e) { next(e); }
  }
};
