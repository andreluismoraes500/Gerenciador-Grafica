import { Response, NextFunction } from 'express';
import { transactionsService } from '../services/transactions.service';
import { AuthRequest } from '../middlewares/auth';
import { createTransactionSchema, updateTransactionSchema } from '../validators/transaction.validator';
import { logActivity } from '../services/activity.service';

export const transactionsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', type, status, from, to } = req.query;
      const result = await transactionsService.list({
        page: +page, limit: +limit, type: type as string, status: status as string,
        from: from as string, to: to as string
      });
      res.json(result);
    } catch (e) { next(e); }
  },
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createTransactionSchema.parse(req.body);
      const transaction = await transactionsService.create(data);
      await logActivity(req.user!.id, 'CREATE_TRANSACTION', 'Transaction', transaction.id);
      res.status(201).json(transaction);
    } catch (e) { next(e); }
  },
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = updateTransactionSchema.parse(req.body);
      const status = data.status;

      if (!status) {
        return next(new Error('Status is required to update a transaction.'));
      }

      const transaction = await transactionsService.updateStatus(id, status);
      res.json(transaction);
    } catch (e) { next(e); }
  },
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await transactionsService.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await transactionsService.getSummary();
      res.json(summary);
    } catch (e) { next(e); }
  }
};