// backend/src/controllers/kits.controller.ts

import { Response, NextFunction } from 'express';
import { kitsService } from '../services/kits.service';
import { AuthRequest } from '../middlewares/auth';
import { logActivity } from '../services/activity.service';
import { notificationsService } from '../services/notifications.service';

const getParamId = (value: string | string[] | undefined): string => {
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
};

export const kitsController = {
    /**
     * Listar kits
     */
    async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { page = '1', limit = '20', search, isActive } = req.query;
            const result = await kitsService.list({
                page: +page,
                limit: +limit,
                search: search as string,
                isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            });
            res.json(result);
        } catch (e) {
            console.error('[kits.controller] list error:', e);
            next(e);
        }
    },

    /**
     * Buscar kit por ID
     */
    async getById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const kit = await kitsService.getById(id);
            res.json(kit);
        } catch (e) {
            console.error('[kits.controller] getById error:', e);
            next(e);
        }
    },

    /**
     * Criar kit
     */
    async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            console.log('[kits.controller] create - body:', req.body);
            
            const kit = await kitsService.create(req.body);
            
            await logActivity(req.user!.id, 'CREATE_KIT', 'Kit', kit.id, {
                name: kit.name,
                price: kit.price,
                productCount: kit.productCount,
            });

            // Notifica equipe sobre novo kit
            await notificationsService.notifyTeam(req.user!.id, {
                title: '📦 Novo kit criado',
                message: `Kit "${kit.name}" com ${kit.productCount} produto(s) — R$ ${kit.price.toFixed(2)}`,
                type: 'INFO',
                metadata: { entity: 'Kit', entityId: kit.id, route: '/kits' },
            });

            res.status(201).json(kit);
        } catch (e) {
            console.error('[kits.controller] create error:', e);
            next(e);
        }
    },

    /**
     * Atualizar kit
     */
    async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const kit = await kitsService.update(id, req.body);
            
            await logActivity(req.user!.id, 'UPDATE_KIT', 'Kit', kit.id, {
                name: kit.name,
                price: kit.price,
            });

            res.json(kit);
        } catch (e) {
            console.error('[kits.controller] update error:', e);
            next(e);
        }
    },

    /**
     * Excluir kit
     */
    async delete(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const result = await kitsService.delete(id);
            
            await logActivity(req.user!.id, 'DELETE_KIT', 'Kit', id);
            
            if (result.deactivated) {
                res.json({ message: 'Kit desativado (em uso em pedidos)' });
            } else {
                res.status(204).send();
            }
        } catch (e) {
            console.error('[kits.controller] delete error:', e);
            next(e);
        }
    },

    /**
     * Calcular preço do kit
     */
    async calculatePrice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const calculation = await kitsService.calculatePrice(id);
            res.json(calculation);
        } catch (e) {
            console.error('[kits.controller] calculatePrice error:', e);
            next(e);
        }
    },

    /**
     * Verificar disponibilidade de estoque
     */
    async checkAvailability(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const quantity = parseInt(req.query.quantity as string) || 1;
            const availability = await kitsService.checkAvailability(id, quantity);
            res.json(availability);
        } catch (e) {
            console.error('[kits.controller] checkAvailability error:', e);
            next(e);
        }
    },

    /**
     * Estatísticas de kits
     */
    async getStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const stats = await kitsService.getStats();
            res.json(stats);
        } catch (e) {
            console.error('[kits.controller] getStats error:', e);
            next(e);
        }
    },

    /**
     * Produtos disponíveis para kits
     */
    async getAvailableProducts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { search } = req.query;
            const products = await kitsService.getAvailableProducts(search as string);
            res.json(products);
        } catch (e) {
            console.error('[kits.controller] getAvailableProducts error:', e);
            next(e);
        }
    },
};