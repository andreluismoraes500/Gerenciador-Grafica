// backend/src/routes/kits.routes.ts
import { Router } from 'express';
import { kitsController } from '../controllers/kits.controller';
import { canViewProducts, canManageProducts } from '../middlewares/auth';

export const kitsRoutes = Router();

// ✅ ROTA PARA PRODUTOS DISPONÍVEIS - DEVE VIR ANTES DE /:id
// O Express avalia as rotas na ordem em que são definidas
// Se colocarmos /:id antes, ele vai interpretar "available-products" como um ID
kitsRoutes.get('/available-products', canViewProducts, kitsController.getAvailableProducts);

// Visualização - todos podem ver
kitsRoutes.get('/', canViewProducts, kitsController.list);
kitsRoutes.get('/:id', canViewProducts, kitsController.getById);
kitsRoutes.get('/:id/calculate-price', canViewProducts, kitsController.calculatePrice);
kitsRoutes.get('/:id/availability', canViewProducts, kitsController.checkAvailability);
kitsRoutes.get('/stats/summary', canViewProducts, kitsController.getStats);

// Gerenciamento - apenas ADMIN e ATTENDANT
kitsRoutes.post('/', canManageProducts, kitsController.create);
kitsRoutes.put('/:id', canManageProducts, kitsController.update);
kitsRoutes.delete('/:id', canManageProducts, kitsController.delete);