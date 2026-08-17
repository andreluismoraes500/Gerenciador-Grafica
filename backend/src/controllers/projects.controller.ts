// backend/src/controllers/projects.controller.ts
import { Response, NextFunction } from 'express';
import { projectsService } from '../services/projects.service';
import { AuthRequest } from '../middlewares/auth';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { logActivity } from '../services/activity.service';
import { notificationsService } from '../services/notifications.service';
import { prisma } from '../config/database';
import path from 'path';
import fs from 'fs';

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
        role: req.user!.role,
      });
      res.json(result);
    } catch (e) { 
      console.error('[ProjectsController] list error:', e);
      next(e); 
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const project = await projectsService.getById(id);
      res.json(project);
    } catch (e) { 
      console.error('[ProjectsController] getById error:', e);
      next(e); 
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      console.log('[ProjectsController] create - body:', req.body);
      
      const data = createProjectSchema.parse(req.body);
      console.log('[ProjectsController] create - validated data:', data);
      
      const project = await projectsService.create(data, req.user!.id);
      console.log('[ProjectsController] create - project created:', project.id);
      
      await logActivity(req.user!.id, 'CREATE_PROJECT', 'Project', project.id, { title: project.title });

      if (project.designerId && project.designerId !== req.user!.id) {
        await notificationsService.create(project.designerId, {
          title: 'Novo projeto atribuído a você',
          message: `Projeto "${project.title}" precisa da sua atenção.`,
          type: 'INFO',
          metadata: { entity: 'Project', entityId: project.id, route: '/projects' },
        });
      }

      await notificationsService.notifyTeam(req.user!.id, {
        title: 'Novo projeto criado',
        message: `"${project.title}" — ${project.client?.name || ''}`,
        type: 'INFO',
        metadata: { entity: 'Project', entityId: project.id, route: '/projects' },
      });

      req.app.get('io')?.to(`user:${req.user!.id}`).emit('project:created', project);
      
      res.status(201).json(project);
    } catch (e) { 
      console.error('[ProjectsController] create error:', e);
      next(e); 
    }
  },

  /**
   * 🔥 EDITAR PROJETO - Atualiza dados do projeto
   */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const data = updateProjectSchema.parse(req.body);
      
      console.log('[ProjectsController] update - project:', id, 'data:', data);
      
      const project = await projectsService.update(id, data, req.user!.id);
      
      await logActivity(req.user!.id, 'UPDATE_PROJECT', 'Project', project.id, { 
        title: project.title,
        changes: data 
      });
      
      // Emite via Socket.IO
      req.app.get('io')?.emit('project:updated', project);
      
      res.json(project);
    } catch (e) { 
      console.error('[ProjectsController] update error:', e);
      next(e); 
    }
  },

  /**
   * 🔥 EXCLUIR PROJETO - Remove o projeto e todos os arquivos
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      
      console.log('[ProjectsController] delete - project:', id);
      
      // Busca o projeto para saber o título antes de excluir
      const project = await prisma.project.findUnique({
        where: { id },
        select: { title: true, status: true }
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }
      
      // Verifica se pode excluir
      if (project.status === 'COMPLETED') {
        return res.status(400).json({ 
          error: 'Projetos concluídos não podem ser excluídos. Considere arquivar.' 
        });
      }
      
      await projectsService.delete(id, req.user!.id);
      
      await logActivity(req.user!.id, 'DELETE_PROJECT', 'Project', id, { 
        title: project.title 
      });
      
      // Emite via Socket.IO
      req.app.get('io')?.emit('project:deleted', { projectId: id });
      
      res.status(204).send();
    } catch (e) { 
      console.error('[ProjectsController] delete error:', e);
      next(e); 
    }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const id = getParamId(req.params.id);
      
      console.log('[ProjectsController] updateStatus - project:', id, 'status:', status);
      
      const project = await projectsService.updateStatus(id, status, req.user!.id);
      
      await logActivity(req.user!.id, 'UPDATE_PROJECT_STATUS', 'Project', project.id, { status });
      
      req.app.get('io')?.emit('project:status-changed', project);
      
      res.json(project);
    } catch (e) { 
      console.error('[ProjectsController] updateStatus error:', e);
      next(e); 
    }
  },

  async completeProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      
      console.log('[ProjectsController] completeProject - project:', id);
      
      const project = await projectsService.completeProject(id, req.user!.id);
      
      await logActivity(req.user!.id, 'COMPLETE_PROJECT', 'Project', project.id, { title: project.title });
      
      req.app.get('io')?.emit('project:completed', project);
      
      res.json(project);
    } catch (e) { 
      console.error('[ProjectsController] completeProject error:', e);
      next(e); 
    }
  },

  async uploadFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      console.log('[ProjectsController] uploadFiles - projectId:', req.params.id);
      console.log('[ProjectsController] uploadFiles - files:', req.files);
      console.log('[ProjectsController] uploadFiles - user:', req.user?.id);
      
      const files = req.files as Express.Multer.File[];
      const id = getParamId(req.params.id);
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const project = await prisma.project.findUnique({
        where: { id },
        select: { id: true, title: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const result = await projectsService.uploadFiles(id, files, req.user!.id);
      
      await logActivity(req.user!.id, 'UPLOAD_FILES', 'Project', id, { 
        count: files.length,
        files: files.map(f => f.originalname)
      });
      
      console.log('[ProjectsController] uploadFiles - success:', result.length, 'files uploaded');
      
      res.json(result);
    } catch (e) { 
      console.error('[ProjectsController] uploadFiles error:', e);
      next(e); 
    }
  },

  async updateFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const fileId = getParamId(req.params.fileId);
      const { isFinal } = req.body;
      
      console.log('[ProjectsController] updateFile - project:', id, 'file:', fileId, 'isFinal:', isFinal);
      
      const file = await projectsService.updateFile(id, fileId, { isFinal }, req.user!.id);
      
      res.json(file);
    } catch (e) { 
      console.error('[ProjectsController] updateFile error:', e);
      next(e); 
    }
  },

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const fileId = getParamId(req.params.fileId);
      
      console.log('[ProjectsController] deleteFile - project:', id, 'file:', fileId);
      
      await projectsService.deleteFile(id, fileId, req.user!.id);
      
      await logActivity(req.user!.id, 'DELETE_FILE', 'Project', id, { fileId });
      
      res.status(204).send();
    } catch (e) { 
      console.error('[ProjectsController] deleteFile error:', e);
      next(e); 
    }
  },

  async downloadFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
    const projectId = getParamId(req.params.id);
    const fileId = getParamId(req.params.fileId);
    
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId }
    });
      
      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }
      
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filePath = path.join(uploadDir, path.basename(file.url));
      
      console.log('[ProjectsController] downloadFile - filePath:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error('[ProjectsController] downloadFile - arquivo físico não encontrado:', filePath);
        return res.status(404).json({ error: 'Arquivo físico não encontrado' });
      }
      
      const stat = fs.statSync(filePath);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'no-cache');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('[ProjectsController] downloadFile - erro no stream:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao ler o arquivo' });
        }
      });
    } catch (e) {
      console.error('[ProjectsController] downloadFile error:', e);
      next(e);
    }
  },

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content, isInternal, parentId } = req.body;
      const id = getParamId(req.params.id);
      
      console.log('[ProjectsController] addComment - project:', id);
      
      const comment = await projectsService.addComment(id, {
        content,
        isInternal,
        parentId,
        userId: req.user!.id,
      });
      
      req.app.get('io')?.to(`project:${id}`).emit('project:comment-added', comment);
      
      res.status(201).json(comment);
    } catch (e) { 
      console.error('[ProjectsController] addComment error:', e);
      next(e); 
    }
  },

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const commentId = getParamId(req.params.commentId);
      
      console.log('[ProjectsController] deleteComment - project:', id, 'comment:', commentId);
      
      await projectsService.deleteComment(id, commentId, req.user!.id);
      
      res.status(204).send();
    } catch (e) { 
      console.error('[ProjectsController] deleteComment error:', e);
      next(e); 
    }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { approvedBy, approvedEmail, signature, notes } = req.body;
      const id = getParamId(req.params.id);
      
      console.log('[ProjectsController] approve - project:', id, 'approvedBy:', approvedBy);
      
      const approval = await projectsService.approve(id, {
        approvedBy,
        approvedEmail,
        signature,
        notes,
      });

      await logActivity(req.user!.id, 'APPROVE_PROJECT', 'Project', id, { approvedBy });

      await notificationsService.notifyTeam(req.user!.id, {
        title: '✅ Projeto aprovado pelo cliente',
        message: `O projeto foi aprovado por ${approvedBy}. Produção pode ser iniciada.`,
        type: 'SUCCESS',
        metadata: { entity: 'Project', entityId: id, route: '/projects' },
      });

      req.app.get('io')?.emit('project:approved', { projectId: id, approval });
      
      res.status(201).json(approval);
    } catch (e) { 
      console.error('[ProjectsController] approve error:', e);
      next(e); 
    }
  }
};