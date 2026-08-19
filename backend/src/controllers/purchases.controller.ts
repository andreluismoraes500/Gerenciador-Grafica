// backend/src/controllers/purchases.controller.ts

import { Response, NextFunction } from 'express';
import { purchasesService } from '../services/purchases.service';
import { AuthRequest } from '../middlewares/auth';
import { logActivity } from '../services/activity.service';
import { notificationsService } from '../services/notifications.service';

const getParamId = (value: string | string[] | undefined): string => {
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
};

export const purchasesController = {
    /**
     * Listar compras
     */
    async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { page = '1', limit = '20', status, supplierId, search } = req.query;
            const result = await purchasesService.list({
                page: +page,
                limit: +limit,
                status: status as string,
                supplierId: supplierId as string,
                search: search as string,
            });
            res.json(result);
        } catch (e) {
            console.error('[purchases.controller] list error:', e);
            next(e);
        }
    },

    /**
     * Buscar compra por ID
     */
    async getById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const purchase = await purchasesService.getById(id);
            res.json(purchase);
        } catch (e) {
            console.error('[purchases.controller] getById error:', e);
            next(e);
        }
    },

    /**
     * Criar compra
     */
    async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            console.log('[purchases.controller] create - body:', req.body);
            
            const purchase = await purchasesService.create(req.body);
            
            await logActivity(req.user!.id, 'CREATE_PURCHASE', 'Purchase', purchase.id, {
                code: purchase.code,
                supplier: purchase.supplier.name,
                total: purchase.total,
            });

            // Notifica equipe sobre nova compra
            await notificationsService.notifyTeam(req.user!.id, {
                title: '🛒 Nova compra criada',
                message: `Compra ${purchase.code} — ${purchase.supplier.name} — R$ ${purchase.total.toFixed(2)}`,
                type: 'INFO',
                metadata: { entity: 'Purchase', entityId: purchase.id, route: '/purchases' },
            });

            res.status(201).json(purchase);
        } catch (e) {
            console.error('[purchases.controller] create error:', e);
            next(e);
        }
    },

    /**
     * Atualizar compra
     */
    async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const purchase = await purchasesService.update(id, req.body);
            
            await logActivity(req.user!.id, 'UPDATE_PURCHASE', 'Purchase', purchase.id, {
                code: purchase.code,
                supplier: purchase.supplier.name,
            });

            res.json(purchase);
        } catch (e) {
            console.error('[purchases.controller] update error:', e);
            next(e);
        }
    },

    /**
     * Atualizar status da compra
     */
    async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const purchase = await purchasesService.updateStatus(id, status);

            if (purchase) {
                await logActivity(req.user!.id, 'UPDATE_PURCHASE_STATUS', 'Purchase', purchase.id, {
                    code: purchase.code,
                    status,
                });
            }

            // Emite via Socket.IO
            req.app.get('io')?.emit('purchase:status-changed', purchase);

            return res.json(purchase);
        } catch (e) {
            console.error('[purchases.controller] updateStatus error:', e);
            return next(e);
        }
    },

    /**
     * Excluir compra
     */
    async delete(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = getParamId(req.params.id);
            await purchasesService.delete(id);
            
            await logActivity(req.user!.id, 'DELETE_PURCHASE', 'Purchase', id);
            
            res.status(204).send();
        } catch (e) {
            console.error('[purchases.controller] delete error:', e);
            next(e);
        }
    },

    /**
     * Estatísticas de compras
     */
    async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const stats = await purchasesService.getStats();
            res.json(stats);
        } catch (e) {
            console.error('[purchases.controller] getStats error:', e);
            next(e);
        }
    },
};