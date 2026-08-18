import { Router } from 'express';
import { clientsController } from '../controllers/clients.controller';
import { canViewClients, canManageClients } from '../middlewares/auth';

export const clientsRoutes = Router();

// Visualização - todos podem ver
clientsRoutes.get('/', canViewClients, clientsController.list);
clientsRoutes.get('/:id', canViewClients, clientsController.getById);
clientsRoutes.get('/:id/orders', canViewClients, clientsController.getOrders);
clientsRoutes.get('/:id/projects', canViewClients, clientsController.getProjects);
clientsRoutes.get('/:id/quotes', canViewClients, clientsController.getQuotes);

// Gerenciamento - apenas ADMIN e ATTENDANT
clientsRoutes.post('/', canManageClients, clientsController.create);
clientsRoutes.put('/:id', canManageClients, clientsController.update);
clientsRoutes.delete('/:id', canManageClients, clientsController.delete);
clientsRoutes.get('/stats/summary', canManageClients, clientsController.getStats);