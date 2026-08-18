import { Router } from 'express';
import { transactionsController } from '../controllers/transactions.controller';
import { canViewFinance, canManageFinance } from '../middlewares/auth';

export const transactionsRoutes = Router();

// Visualização - ADMIN e ATTENDANT
transactionsRoutes.get('/', canViewFinance, transactionsController.list);
transactionsRoutes.get('/summary', canViewFinance, transactionsController.getSummary);

// Gerenciamento - apenas ADMIN
transactionsRoutes.post('/', canManageFinance, transactionsController.create);
transactionsRoutes.put('/:id', canManageFinance, transactionsController.update);
transactionsRoutes.delete('/:id', canManageFinance, transactionsController.delete);