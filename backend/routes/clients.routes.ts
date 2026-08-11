import { Router } from 'express';
import { clientsController } from '../controllers/clients.controller';
import { requireRole } from '../middlewares/auth';

export const clientsRoutes = Router();

clientsRoutes.get('/', requireRole('ADMIN', 'ATTENDANT', 'DESIGNER'), clientsController.list);
clientsRoutes.get('/:id', requireRole('ADMIN', 'ATTENDANT', 'DESIGNER'), clientsController.getById);
clientsRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), clientsController.create);
clientsRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), clientsController.update);
clientsRoutes.delete('/:id', requireRole('ADMIN'), clientsController.delete);
clientsRoutes.get('/:id/orders', clientsController.getOrders);
clientsRoutes.get('/:id/projects', clientsController.getProjects);
clientsRoutes.get('/:id/quotes', clientsController.getQuotes);
clientsRoutes.get('/stats/summary', requireRole('ADMIN'), clientsController.getStats);