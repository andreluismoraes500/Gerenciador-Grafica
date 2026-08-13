import { Router } from 'express';
import { transactionsController } from '../controllers/transactions.controller';
import { requireRole } from '../middlewares/auth';

export const transactionsRoutes = Router();
transactionsRoutes.get('/summary', requireRole('ADMIN', 'ATTENDANT'), transactionsController.getSummary);
transactionsRoutes.get('/', requireRole('ADMIN', 'ATTENDANT'), transactionsController.list);
transactionsRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), transactionsController.create);
transactionsRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), transactionsController.update);
transactionsRoutes.delete('/:id', requireRole('ADMIN'), transactionsController.delete);