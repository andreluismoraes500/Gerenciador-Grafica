import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { canViewOrders, canManageOrders } from '../middlewares/auth';

export const ordersRoutes = Router();

// Visualização - todos podem ver (incluindo DESIGNER)
ordersRoutes.get('/', canViewOrders, ordersController.list);
ordersRoutes.get('/:id', canViewOrders, ordersController.getById);
ordersRoutes.get('/:id/invoice', canViewOrders, ordersController.getInvoice);

// Gerenciamento - apenas ADMIN e ATTENDANT
ordersRoutes.post('/', canManageOrders, ordersController.create);
ordersRoutes.put('/:id', canManageOrders, ordersController.update);
ordersRoutes.delete('/:id', canManageOrders, ordersController.delete);
ordersRoutes.patch('/:id/status', canManageOrders, ordersController.updateStatus);
ordersRoutes.patch('/:id/payment', canManageOrders, ordersController.updatePaymentStatus);
ordersRoutes.post('/:id/invoice', canManageOrders, ordersController.createInvoice);
ordersRoutes.get('/stats/monthly', canManageOrders, ordersController.getMonthlyStats);