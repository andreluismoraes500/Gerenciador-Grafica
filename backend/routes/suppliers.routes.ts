import { Router } from 'express';
import { suppliersController } from '../controllers/suppliers.controller';
import { requireRole } from '../middlewares/auth';

export const suppliersRoutes = Router();

suppliersRoutes.get('/', requireRole('ADMIN', 'ATTENDANT'), suppliersController.list);
suppliersRoutes.get('/:id', requireRole('ADMIN', 'ATTENDANT'), suppliersController.getById);
suppliersRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), suppliersController.create);
suppliersRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), suppliersController.update);
suppliersRoutes.delete('/:id', requireRole('ADMIN'), suppliersController.delete);
suppliersRoutes.get('/:id/purchases', suppliersController.getPurchases);
suppliersRoutes.post('/:id/purchases', requireRole('ADMIN', 'ATTENDANT'), suppliersController.createPurchase);
suppliersRoutes.patch('/purchases/:purchaseId/pay', requireRole('ADMIN', 'ATTENDANT'), suppliersController.markPurchaseAsPaid);