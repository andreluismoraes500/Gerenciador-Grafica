import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller';
import { canManageTasks } from '../middlewares/auth';

export const tasksRoutes = Router();

// Todos os usuários com permissão podem fazer tudo em tarefas
tasksRoutes.get('/', canManageTasks, tasksController.list);
tasksRoutes.get('/:id', canManageTasks, tasksController.getById);
tasksRoutes.post('/', canManageTasks, tasksController.create);
tasksRoutes.put('/:id', canManageTasks, tasksController.update);
tasksRoutes.delete('/:id', canManageTasks, tasksController.delete);
tasksRoutes.patch('/:id/status', canManageTasks, tasksController.updateStatus);
tasksRoutes.get('/my', canManageTasks, tasksController.getMyTasks);
tasksRoutes.get('/stats', canManageTasks, tasksController.getStats);