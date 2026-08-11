import { Response, NextFunction } from 'express';
import { projectsService } from '../services/projects.service';
import { AuthRequest } from '../middlewares/auth';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { logActivity } from '../services/activity.service';

export const projectsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status, clientId, designerId } = req.query;
      const result = await projectsService.list({
        page: +page,
        limit: +limit,
        status: status as any,
        clientId: clientId as string,
        designerId: designerId as string,
        userId: req.user!.id,
        role: req.user!.role
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectsService.getById(req.params.id);
      res.json(project);
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createProjectSchema.parse(req.body);
      const project = await projectsService.create(data, req.user!.id);
      await logActivity(req.user!.id, 'CREATE_PROJECT', 'Project', project.id, { title: project.title });
      
      req.app.get('io')?.to(`user:${req.user!.id}`).emit('project:created', project);
      res.status(201).json(project);
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateProjectSchema.parse(req.body);
      const project = await projectsService.update(req.params.id, data, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_PROJECT', 'Project', project.id, { title: project.title });
      res.json(project);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await projectsService.delete(req.params.id, req.user!.id);
      await logActivity(req.user!.id, 'DELETE_PROJECT', 'Project', req.params.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const project = await projectsService.updateStatus(req.params.id, status, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_PROJECT_STATUS', 'Project', project.id, { status });
      
      req.app.get('io')?.emit('project:status-changed', project);
      res.json(project);
    } catch (e) { next(e); }
  },

  async uploadFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      const result = await projectsService.uploadFiles(req.params.id, files, req.user!.id);
      res.json(result);
    } catch (e) { next(e); }
  },

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await projectsService.deleteFile(req.params.id, req.params.fileId, req.user!.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content, isInternal, parentId } = req.body;
      const comment = await projectsService.addComment(req.params.id, {
        content,
        isInternal,
        parentId,
        userId: req.user!.id
      });
      
      req.app.get('io')?.to(`project:${req.params.id}`).emit('project:comment-added', comment);
      res.status(201).json(comment);
    } catch (e) { next(e); }
  },

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await projectsService.deleteComment(req.params.id, req.params.commentId, req.user!.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { approvedBy, approvedEmail, signature, notes } = req.body;
      const approval = await projectsService.approve(req.params.id, {
        approvedBy,
        approvedEmail,
        signature,
        notes
      });
      
      req.app.get('io')?.emit('project:approved', { projectId: req.params.id, approval });
      res.status(201).json(approval);
    } catch (e) { next(e); }
  }
};