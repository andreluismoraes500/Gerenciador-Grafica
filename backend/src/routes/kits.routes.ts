// backend/src/routes/kits.routes.ts

import { Router } from 'express';
import { kitsController } from '../controllers/kits.controller';
import { canViewProducts, canManageProducts } from '../middlewares/auth';

export const kitsRoutes = Router();

// Visualização - todos podem ver (ADMIN, ATTENDANT, DESIGNER)
kitsRoutes.get('/', canViewProducts, kitsController.list);
kitsRoutes.get('/:id', canViewProducts, kitsController.getById);
kitsRoutes.get('/:id/calculate-price', canViewProducts, kitsController.calculatePrice);
kitsRoutes.get('/:id/availability', canViewProducts, kitsController.checkAvailability);
kitsRoutes.get('/stats/summary', canViewProducts, kitsController.getStats);
kitsRoutes.get('/available-products', canViewProducts, kitsController.getAvailableProducts);

// Gerenciamento - apenas ADMIN e ATTENDANT
kitsRoutes.post('/', canManageProducts, kitsController.create);
kitsRoutes.put('/:id', canManageProducts, kitsController.update);
kitsRoutes.delete('/:id', canManageProducts, kitsController.delete);