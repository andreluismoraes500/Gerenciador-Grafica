import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller';
import { requireRole } from '../middlewares/auth';

export const tasksRoutes = Router();

tasksRoutes.get('/', tasksController.list);
tasksRoutes.get('/:id', tasksController.getById);
tasksRoutes.post('/', requireRole('ADMIN', 'ATTENDANT', 'DESIGNER'), tasksController.create);
tasksRoutes.put('/:id', tasksController.update);
tasksRoutes.delete('/:id', tasksController.delete);
tasksRoutes.patch('/:id/status', tasksController.updateStatus);
tasksRoutes.get('/my', tasksController.getMyTasks);
tasksRoutes.get('/stats', requireRole('ADMIN'), tasksController.getStats);