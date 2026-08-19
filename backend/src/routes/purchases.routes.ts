// backend/src/routes/purchases.routes.ts

import { Router } from 'express';
import { purchasesController } from '../controllers/purchases.controller';
import { canViewFinance, canManageFinance } from '../middlewares/auth';

export const purchasesRoutes = Router();

// Visualização - ADMIN e ATTENDANT podem ver
purchasesRoutes.get('/', canViewFinance, purchasesController.list);
purchasesRoutes.get('/:id', canViewFinance, purchasesController.getById);
purchasesRoutes.get('/stats/summary', canViewFinance, purchasesController.getStats);

// Gerenciamento - apenas ADMIN pode gerenciar
purchasesRoutes.post('/', canManageFinance, purchasesController.create);
purchasesRoutes.put('/:id', canManageFinance, purchasesController.update);
purchasesRoutes.patch('/:id/status', canManageFinance, purchasesController.updateStatus);
purchasesRoutes.delete('/:id', canManageFinance, purchasesController.delete);