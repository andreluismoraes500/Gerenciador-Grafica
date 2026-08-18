import { Router } from 'express';
import { projectsController } from '../controllers/projects.controller';
import { canViewProjects, canManageProjects } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

export const projectsRoutes = Router();

// Visualização - todos podem ver (incluindo CLIENT)
projectsRoutes.get('/', canViewProjects, projectsController.list);
projectsRoutes.get('/:id', canViewProjects, projectsController.getById);
projectsRoutes.get('/:id/files/:fileId/download', canViewProjects, projectsController.downloadFile);

// Gerenciamento - ADMIN, ATTENDANT e DESIGNER
projectsRoutes.post('/', canManageProjects, projectsController.create);
projectsRoutes.put('/:id', canManageProjects, projectsController.update);
projectsRoutes.delete('/:id', canManageProjects, projectsController.delete);
projectsRoutes.patch('/:id/status', canManageProjects, projectsController.updateStatus);
projectsRoutes.post('/:id/complete', canManageProjects, projectsController.completeProject);
projectsRoutes.post('/:id/files', canManageProjects, upload.array('files', 10), projectsController.uploadFiles);
projectsRoutes.patch('/:id/files/:fileId', canManageProjects, projectsController.updateFile);
projectsRoutes.delete('/:id/files/:fileId', canManageProjects, projectsController.deleteFile);
projectsRoutes.post('/:id/comments', canManageProjects, projectsController.addComment);
projectsRoutes.delete('/:id/comments/:commentId', canManageProjects, projectsController.deleteComment);
projectsRoutes.post('/:id/approve', canManageProjects, projectsController.approve);