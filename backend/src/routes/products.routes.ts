import { Router } from 'express';
import { productsController } from '../controllers/products.controller';
import { requireRole } from '../middlewares/auth';
export const productsRoutes = Router();

// 🚨 ROTAS ESPECÍFICAS DEVEM VIR ANTES DE /:id
productsRoutes.get('/categories', productsController.listCategories);
productsRoutes.post('/categories', requireRole('ADMIN'), productsController.createCategory);
productsRoutes.get('/low-stock', requireRole('ADMIN', 'ATTENDANT'), productsController.getLowStock);

// Rotas padrão
productsRoutes.get('/', productsController.list);
productsRoutes.get('/:id', productsController.getById);
productsRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), productsController.create);
productsRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), productsController.update);
productsRoutes.delete('/:id', requireRole('ADMIN'), productsController.delete);
productsRoutes.patch('/:id/stock', requireRole('ADMIN', 'ATTENDANT'), productsController.updateStock);