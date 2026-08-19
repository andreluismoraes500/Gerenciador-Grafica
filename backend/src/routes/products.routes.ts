// backend/src/routes/products.routes.ts
import { Router } from 'express';
import { productsController } from '../controllers/products.controller';
import { canViewProducts, canManageProducts } from '../middlewares/auth';

export const productsRoutes = Router();

// ✅ ROTA PARA CATEGORIAS - DEVE VIR ANTES DAS ROTAS COM PARÂMETROS (:id)
// O Express avalia as rotas na ordem em que são definidas
// Se colocarmos /:id antes de /categories, ele vai interpretar "categories" como um ID
productsRoutes.get('/categories', canViewProducts, productsController.listCategories);
productsRoutes.post('/categories', canManageProducts, productsController.createCategory);

// Visualização - todos podem ver
productsRoutes.get('/', canViewProducts, productsController.list);
productsRoutes.get('/:id', canViewProducts, productsController.getById);

// Gerenciamento - apenas ADMIN e ATTENDANT
productsRoutes.post('/', canManageProducts, productsController.create);
productsRoutes.put('/:id', canManageProducts, productsController.update);
productsRoutes.delete('/:id', canManageProducts, productsController.delete);
productsRoutes.patch('/:id/stock', canManageProducts, productsController.updateStock);
productsRoutes.get('/low-stock', canManageProducts, productsController.getLowStock);