import { Router } from 'express';
import { projectsController } from '../controllers/projects.controller';
import { requireRole } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

export const projectsRoutes = Router();

projectsRoutes.get('/', projectsController.list);
projectsRoutes.get('/:id', projectsController.getById);
projectsRoutes.post('/', requireRole('ADMIN', 'ATTENDANT', 'DESIGNER'), projectsController.create);
projectsRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT', 'DESIGNER'), projectsController.update);
projectsRoutes.delete('/:id', requireRole('ADMIN', 'DESIGNER'), projectsController.delete);
projectsRoutes.patch('/:id/status', requireRole('ADMIN', 'ATTENDANT', 'DESIGNER'), projectsController.updateStatus);
projectsRoutes.post('/:id/files', requireRole('ADMIN', 'DESIGNER'), upload.array('files', 10), projectsController.uploadFiles);
projectsRoutes.delete('/:id/files/:fileId', requireRole('ADMIN', 'DESIGNER'), projectsController.deleteFile);
projectsRoutes.post('/:id/comments', projectsController.addComment);
projectsRoutes.delete('/:id/comments/:commentId', projectsController.deleteComment);
projectsRoutes.post('/:id/approve', projectsController.approve);