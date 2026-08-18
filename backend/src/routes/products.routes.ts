import { Router } from 'express';
import { productsController } from '../controllers/products.controller';
import { canViewProducts, canManageProducts } from '../middlewares/auth';

export const productsRoutes = Router();

// Visualização - todos podem ver
productsRoutes.get('/', canViewProducts, productsController.list);
productsRoutes.get('/:id', canViewProducts, productsController.getById);
productsRoutes.get('/categories', canViewProducts, productsController.listCategories);

// Gerenciamento - apenas ADMIN e ATTENDANT
productsRoutes.post('/', canManageProducts, productsController.create);
productsRoutes.put('/:id', canManageProducts, productsController.update);
productsRoutes.delete('/:id', canManageProducts, productsController.delete);
productsRoutes.patch('/:id/stock', canManageProducts, productsController.updateStock);
productsRoutes.get('/low-stock', canManageProducts, productsController.getLowStock);
productsRoutes.post('/categories', canManageProducts, productsController.createCategory);