import { Router } from 'express';
import { stockItemsController } from '../controllers/stockItems.controller';
import { canViewStock, canManageStock } from '../middlewares/auth';

export const stockItemsRoutes = Router();

// Visualização - todos podem ver (incluindo DESIGNER)
stockItemsRoutes.get('/', canViewStock, stockItemsController.list);

// Gerenciamento - apenas ADMIN e ATTENDANT
stockItemsRoutes.post('/', canManageStock, stockItemsController.create);
stockItemsRoutes.put('/:id', canManageStock, stockItemsController.update);
stockItemsRoutes.delete('/:id', canManageStock, stockItemsController.delete);