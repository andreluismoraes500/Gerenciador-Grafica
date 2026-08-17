// backend/src/controllers/clients.controller.ts
import { Response, NextFunction } from 'express';
import { clientsService } from '../services/clients.service';
import { AuthRequest } from '../middlewares/auth';
import { createClientSchema, updateClientSchema } from '../validators/client.validator';
import { logActivity } from '../services/activity.service';
import { notificationsService } from '../services/notifications.service';

const getParamId = (value: string | string[] | undefined): string => {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
};

export const clientsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, tag } = req.query;
      const result = await clientsService.list({
        page: +page,
        limit: +limit,
        search: search as string,
        tag: tag as string
      });
      res.json(result);
    } catch (e) { 
      console.error('[clients.controller] list error:', e);
      next(e); 
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const client = await clientsService.getById(id);
      res.json(client);
    } catch (e) { 
      console.error('[clients.controller] getById error:', e);
      next(e); 
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      console.log('[clients.controller] create - body:', req.body);
      
      // ✅ Validar dados de entrada
      const data = createClientSchema.parse(req.body);
      console.log('[clients.controller] create - validated data:', data);
      
      const client = await clientsService.create(data, req.user!.id);
      console.log('[clients.controller] create - client created:', client.id);
      
      await logActivity(req.user!.id, 'CREATE_CLIENT', 'Client', client.id, { name: client.name });

      // 🔔 Notificação: avisa equipe sobre novo cliente
      await notificationsService.notifyTeam(req.user!.id, {
        title: 'Novo cliente cadastrado',
        message: `${client.name} foi adicionado à base de clientes.`,
        type: 'INFO',
        metadata: { entity: 'Client', entityId: client.id, route: '/clients' },
      });

      res.status(201).json(client);
    } catch (e) {
      console.error('[clients.controller] create error:', e);
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const data = updateClientSchema.parse(req.body);
      const client = await clientsService.update(id, data, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_CLIENT', 'Client', client.id, { name: client.name });
      res.json(client);
    } catch (e) { 
      console.error('[clients.controller] update error:', e);
      next(e); 
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      await clientsService.delete(id, req.user!.id);
      await logActivity(req.user!.id, 'DELETE_CLIENT', 'Client', id);
      res.status(204).send();
    } catch (e) { 
      console.error('[clients.controller] delete error:', e);
      next(e); 
    }
  },

  async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const orders = await clientsService.getOrders(id);
      res.json(orders);
    } catch (e) { 
      console.error('[clients.controller] getOrders error:', e);
      next(e); 
    }
  },

  async getProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const projects = await clientsService.getProjects(id);
      res.json(projects);
    } catch (e) { 
      console.error('[clients.controller] getProjects error:', e);
      next(e); 
    }
  },

  async getQuotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      const quotes = await clientsService.getQuotes(id);
      res.json(quotes);
    } catch (e) { 
      console.error('[clients.controller] getQuotes error:', e);
      next(e); 
    }
  },

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await clientsService.getStats();
      res.json(stats);
    } catch (e) { 
      console.error('[clients.controller] getStats error:', e);
      next(e); 
    }
  }
};