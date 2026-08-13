import { Router } from 'express';
import { stockItemsController } from '../controllers/stockItems.controller';
import { requireRole } from '../middlewares/auth';

export const stockItemsRoutes = Router();
stockItemsRoutes.get('/', requireRole('ADMIN', 'ATTENDANT'), stockItemsController.list);
stockItemsRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), stockItemsController.create);
stockItemsRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), stockItemsController.update);
stockItemsRoutes.delete('/:id', requireRole('ADMIN'), stockItemsController.delete);