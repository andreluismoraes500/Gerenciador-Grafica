import { Router } from 'express';
import { suppliersController } from '../controllers/suppliers.controller';
import { canViewSuppliers, canManageSuppliers } from '../middlewares/auth';

export const suppliersRoutes = Router();

// Visualização - todos podem ver (incluindo DESIGNER)
suppliersRoutes.get('/', canViewSuppliers, suppliersController.list);
suppliersRoutes.get('/:id', canViewSuppliers, suppliersController.getById);
suppliersRoutes.get('/:id/purchases', canViewSuppliers, suppliersController.getPurchases);

// Gerenciamento - apenas ADMIN e ATTENDANT
suppliersRoutes.post('/', canManageSuppliers, suppliersController.create);
suppliersRoutes.put('/:id', canManageSuppliers, suppliersController.update);
suppliersRoutes.delete('/:id', canManageSuppliers, suppliersController.delete);
suppliersRoutes.post('/:id/purchases', canManageSuppliers, suppliersController.createPurchase);
suppliersRoutes.patch('/purchases/:purchaseId/pay', canManageSuppliers, suppliersController.markPurchaseAsPaid);