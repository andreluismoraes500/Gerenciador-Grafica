import { Response, NextFunction } from 'express';
import { tasksService } from '../services/tasks.service';
import { AuthRequest } from '../middlewares/auth';

export const tasksController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status, projectId, assigneeId } = req.query;
      res.json(await tasksService.list({
        page: +page, limit: +limit, status: status as string,
        projectId: projectId as string, assigneeId: assigneeId as string
      }));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await tasksService.getById(req.params.id)); } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await tasksService.create(req.body, req.user!.id)); } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await tasksService.update(req.params.id, req.body)); } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try { await tasksService.delete(req.params.id); res.status(204).send(); } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await tasksService.updateStatus(req.params.id, req.body.status)); } catch (e) { next(e); }
  },

  async getMyTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await tasksService.getMyTasks(req.user!.id)); } catch (e) { next(e); }
  },

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await tasksService.getStats()); } catch (e) { next(e); }
  }
};
