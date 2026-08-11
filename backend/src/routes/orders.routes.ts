import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { requireRole } from '../middlewares/auth';

export const ordersRoutes = Router();

ordersRoutes.get('/', ordersController.list);
ordersRoutes.get('/:id', ordersController.getById);
ordersRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), ordersController.create);
ordersRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), ordersController.update);
ordersRoutes.delete('/:id', requireRole('ADMIN'), ordersController.delete);
ordersRoutes.patch('/:id/status', requireRole('ADMIN', 'ATTENDANT'), ordersController.updateStatus);
ordersRoutes.patch('/:id/payment', requireRole('ADMIN', 'ATTENDANT'), ordersController.updatePaymentStatus);
ordersRoutes.get('/:id/invoice', ordersController.getInvoice);
ordersRoutes.post('/:id/invoice', requireRole('ADMIN', 'ATTENDANT'), ordersController.createInvoice);
ordersRoutes.get('/stats/monthly', requireRole('ADMIN'), ordersController.getMonthlyStats);
