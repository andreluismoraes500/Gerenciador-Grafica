import { Response, NextFunction } from 'express';
import { stockItemsService } from '../services/stockItems.service';
import { AuthRequest } from '../middlewares/auth';
import { createStockItemSchema, updateStockItemSchema } from '../validators/stockItem.validator';

export const stockItemsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const result = await stockItemsService.list({ page: +page, limit: +limit, search: search as string });
      res.json(result);
    } catch (e) { next(e); }
  },
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createStockItemSchema.parse(req.body);
      res.status(201).json(await stockItemsService.create(data));
    } catch (e) { next(e); }
  },
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = updateStockItemSchema.parse(req.body);
      res.json(await stockItemsService.update(id, data));
    } catch (e) { next(e); }
  },
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await stockItemsService.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  }
};