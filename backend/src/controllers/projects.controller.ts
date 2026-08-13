import { Response, NextFunction } from 'express';
import { projectsService } from '../services/projects.service';
import { AuthRequest } from '../middlewares/auth';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { logActivity } from '../services/activity.service';
import { notificationsService } from '../services/notifications.service';

const getParamId = (value: string | string[] | undefined): string => {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
};

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
      const id = getParamId(req.params.id);
      const project = await projectsService.getById(id);
      res.json(project);
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createProjectSchema.parse(req.body);
      const project = await projectsService.create(data, req.user!.id);
      await logActivity(req.user!.id, 'CREATE_PROJECT', 'Project', project.id, { title: project.title });

      // 🔔 Notificação: avisa o designer atribuído (se houver e não for o criador)
      if (project.designerId && project.designerId !== req.user!.id) {
        await notificationsService.create(project.designerId, {
          title: 'Novo projeto atribuído a você',
          message: `Projeto "${project.title}" precisa da sua atenção.`,
          type: 'INFO',
          metadata: { entity: 'Project', entityId: project.id, route: '/projects' },
        });
      }

      // 🔔 Notificação: avisa o restante da equipe
      await notificationsService.notifyTeam(req.user!.id, {
        title: 'Novo projeto criado',
        message: `"${project.title}" — ${project.client?.name || ''}`,
        type: 'INFO',
        metadata: { entity: 'Project', entityId: project.id, route: '/projects' },
      });

      req.app.get('io')?.to(`user:${req.user!.id}`).emit('project:created', project);
      res.status(201).json(project);
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const data = updateProjectSchema.parse(req.body);
      const project = await projectsService.update(id, data, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_PROJECT', 'Project', project.id, { title: project.title });
      res.json(project);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      await projectsService.delete(id, req.user!.id);
      await logActivity(req.user!.id, 'DELETE_PROJECT', 'Project', id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const id = getParamId(req.params.id);
      const project = await projectsService.updateStatus(id, status, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_PROJECT_STATUS', 'Project', project.id, { status });
      req.app.get('io')?.emit('project:status-changed', project);
      res.json(project);
    } catch (e) { next(e); }
  },

  async uploadFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      const id = getParamId(req.params.id);
      const result = await projectsService.uploadFiles(id, files, req.user!.id);
      res.json(result);
    } catch (e) { next(e); }
  },

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const fileId = getParamId(req.params.fileId);
      await projectsService.deleteFile(id, fileId, req.user!.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content, isInternal, parentId } = req.body;
      const id = getParamId(req.params.id);
      const comment = await projectsService.addComment(id, {
        content,
        isInternal,
        parentId,
        userId: req.user!.id
      });
      req.app.get('io')?.to(`project:${id}`).emit('project:comment-added', comment);
      res.status(201).json(comment);
    } catch (e) { next(e); }
  },

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const commentId = getParamId(req.params.commentId);
      await projectsService.deleteComment(id, commentId, req.user!.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { approvedBy, approvedEmail, signature, notes } = req.body;
      const id = getParamId(req.params.id);
      const approval = await projectsService.approve(id, {
        approvedBy,
        approvedEmail,
        signature,
        notes
      });

      await logActivity(req.user!.id, 'APPROVE_PROJECT', 'Project', id, { approvedBy });

      // 🔔 Notificação: avisa equipe que o projeto foi aprovado
      await notificationsService.notifyTeam(req.user!.id, {
        title: 'Projeto aprovado pelo cliente',
        message: `O projeto foi aprovado por ${approvedBy}. Produção pode ser iniciada.`,
        type: 'SUCCESS',
        metadata: { entity: 'Project', entityId: id, route: '/projects' },
      });

      req.app.get('io')?.emit('project:approved', { projectId: id, approval });
      res.status(201).json(approval);
    } catch (e) { next(e); }
  }
};