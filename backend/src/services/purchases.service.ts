// backend/src/services/purchases.service.ts

import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { notificationsService } from './notifications.service';

interface PurchaseItem {
    stockItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface CreatePurchaseData {
    supplierId: string;
    items: PurchaseItem[];
    discount?: number;
    dueDate?: string;
    notes?: string;
    status?: 'DRAFT' | 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
}

async function generatePurchaseCode() {
    const count = await prisma.purchase.count();
    return `COMP-${String(count + 1).padStart(6, '0')}`;
}

export const purchasesService = {
    /**
     * Listar compras com filtros
     */
    async list({ page = 1, limit = 20, status, supplierId, search }: {
        page: number;
        limit: number;
        status?: string;
        supplierId?: string;
        search?: string;
    }) {
        const where: any = {};
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;
        if (search) {
            where.OR = [
                { code: { contains: search, mode: 'insensitive' } },
                { supplier: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.purchase.findMany({
                where,
                include: {
                    supplier: true,
                    transactions: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.purchase.count({ where }),
        ]);

        // Formata os itens para exibição
        const formattedData = data.map(purchase => ({
            ...purchase,
            items: purchase.items as unknown as PurchaseItem[],
            itemCount: (purchase.items as unknown as PurchaseItem[]).length,
        }));

        return {
            data: formattedData,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },

    /**
     * Buscar compra por ID
     */
    async getById(id: string) {
        const purchase = await prisma.purchase.findUnique({
            where: { id },
            include: {
                supplier: true,
                transactions: true,
            },
        });

        if (!purchase) {
            throw new AppError('Compra não encontrada', 404);
        }

        return {
            ...purchase,
            items: purchase.items as unknown as PurchaseItem[],
        };
    },

    /**
     * Criar nova compra
     */
    async create(data: CreatePurchaseData) {
        const supplier = await prisma.supplier.findUnique({
            where: { id: data.supplierId },
        });

        if (!supplier) {
            throw new AppError('Fornecedor não encontrado', 404);
        }

        if (!data.items || data.items.length === 0) {
            throw new AppError('Adicione pelo menos um item à compra', 400);
        }

        // Verifica se os insumos existem
        const stockItemIds = data.items.map(item => item.stockItemId);
        const stockItems = await prisma.stockItem.findMany({
            where: { id: { in: stockItemIds } },
        });

        if (stockItems.length !== stockItemIds.length) {
            throw new AppError('Um ou mais insumos não foram encontrados', 400);
        }

        // Calcula subtotal e total
        const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal - (data.discount || 0);

        const code = await generatePurchaseCode();

        const purchase = await prisma.purchase.create({
            data: {
                code,
                supplierId: data.supplierId,
                items: data.items as any,
                subtotal,
                discount: data.discount || 0,
                total,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                notes: data.notes,
                status: data.status === 'DRAFT' || data.status === 'RECEIVED'
                    ? undefined
                    : data.status,
            },
            include: {
                supplier: true,
            },
        });

        // Cria transação financeira pendente (se não for rascunho)
        if (data.status !== 'DRAFT') {
            await prisma.transaction.create({
                data: {
                    type: 'EXPENSE',
                    category: 'Compra de Insumos',
                    description: `Compra ${purchase.code} - ${supplier.name}`,
                    amount: purchase.total,
                    dueDate: purchase.dueDate || new Date(),
                    status: purchase.status === 'PAID' ? 'PAID' : 'PENDING',
                    supplierId: supplier.id,
                },
            });
        }

        return purchase;
    },

    /**
     * Atualizar compra
     */
    async update(id: string, data: Partial<CreatePurchaseData>) {
        const existing = await prisma.purchase.findUnique({
            where: { id },
            include: { supplier: true },
        });

        if (!existing) {
            throw new AppError('Compra não encontrada', 404);
        }

        // Se já foi recebida ou paga, não pode mais editar
        if (existing.status === 'RECEIVED' as any || existing.status === 'PAID' as any) {
            throw new AppError('Compras recebidas ou pagas não podem ser editadas', 400);
        }

        const updateData: any = {};

        if (data.items) {
            const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
            const total = subtotal - (data.discount !== undefined ? data.discount : 0);

            updateData.items = data.items as any;
            updateData.subtotal = subtotal;
            updateData.total = total;
        }

        if (data.discount !== undefined) {
            updateData.discount = data.discount;
            // Recalcula total
            const items = (data.items || existing.items) as PurchaseItem[];
            const subtotal = items.reduce((sum, item) => sum + item.total, 0);
            updateData.total = subtotal - data.discount;
        }

        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.status) updateData.status = data.status;

        return prisma.purchase.update({
            where: { id },
            data: updateData,
            include: { supplier: true },
        });
    },

    /**
     * Atualizar status da compra
     */
    async updateStatus(id: string, status: string) {
        const existing = await prisma.purchase.findUnique({
            where: { id },
            include: { supplier: true },
        });

        if (!existing) {
            throw new AppError('Compra não encontrada', 404);
        }

        const validTransitions: Record<string, string[]> = {
            'DRAFT': ['PENDING', 'CANCELLED'],
            'PENDING': ['PAID', 'CANCELLED'],
            'PAID': ['RECEIVED', 'CANCELLED'],
            'RECEIVED': [],
            'CANCELLED': [],
        };

        if (!validTransitions[existing.status]?.includes(status)) {
            throw new AppError(
                `Transição inválida: ${existing.status} -> ${status}`,
                400
            );
        }

        // Se for RECEIVED, atualiza o estoque
        if (status === 'RECEIVED') {
            const items = existing.items as unknown as PurchaseItem[];
            
            await prisma.$transaction(async (tx) => {
                // Atualiza estoque de cada insumo
                for (const item of items) {
                    await tx.stockItem.update({
                        where: { id: item.stockItemId },
                        data: {
                            quantity: { increment: item.quantity },
                            unitCost: item.unitPrice, // Atualiza custo médio
                        },
                    });
                }

                // Atualiza status da compra
                await tx.purchase.update({
                    where: { id },
                    data: { status: status as typeof existing.status },
                });

                // Cria transação de despesa se ainda não existir
                const existingTransaction = await tx.transaction.findFirst({
                    where: {
                        supplierId: existing.supplierId,
                        description: { contains: existing.code },
                    },
                });

                if (!existingTransaction) {
                    await tx.transaction.create({
                        data: {
                            type: 'EXPENSE',
                            category: 'Compra de Insumos',
                            description: `Compra ${existing.code} - ${existing.supplier.name}`,
                            amount: existing.total,
                            dueDate: existing.dueDate || new Date(),
                            status: existing.status === 'PAID' ? 'PAID' : 'PENDING',
                            supplierId: existing.supplierId,
                            paidAt: existing.status === 'PAID' ? new Date() : undefined,
                        },
                    });
                }
            });

            // Notifica equipe sobre entrada de estoque
            const itemNames = items.map(i => i.name).join(', ');
            await notificationsService.notifyTeam('', {
                title: '📦 Compra recebida',
                message: `Compra ${existing.code} recebida: ${items.length} item(ns) (${itemNames})`,
                type: 'SUCCESS',
                metadata: { entity: 'Purchase', entityId: id, route: '/purchases' },
            });
        }

        // Se for PAID, atualiza transação
        if (status === 'PAID') {
            await prisma.$transaction(async (tx) => {
                await tx.purchase.update({
                    where: { id },
                    data: { status: 'PAID', paidAt: new Date() },
                });

                // Atualiza ou cria transação
                const transaction = await tx.transaction.findFirst({
                    where: {
                        supplierId: existing.supplierId,
                        description: { contains: existing.code },
                    },
                });

                if (transaction) {
                    await tx.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 'PAID',
                            paidAt: new Date(),
                        },
                    });
                } else {
                    await tx.transaction.create({
                        data: {
                            type: 'EXPENSE',
                            category: 'Compra de Insumos',
                            description: `Compra ${existing.code} - ${existing.supplier.name}`,
                            amount: existing.total,
                            dueDate: existing.dueDate || new Date(),
                            status: 'PAID',
                            supplierId: existing.supplierId,
                            paidAt: new Date(),
                        },
                    });
                }
            });

            await notificationsService.notifyTeam('', {
                title: '💳 Compra paga',
                message: `Compra ${existing.code} foi paga — R$ ${existing.total.toFixed(2)}`,
                type: 'SUCCESS',
                metadata: { entity: 'Purchase', entityId: id, route: '/purchases' },
            });
        }

        return prisma.purchase.findUnique({
            where: { id },
            include: { supplier: true },
        });
    },

    /**
     * Excluir compra (apenas rascunhos)
     */
    async delete(id: string) {
        const existing = await prisma.purchase.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new AppError('Compra não encontrada', 404);
        }

        if (existing.status !== ('DRAFT' as any)) {
            throw new AppError('Apenas compras em rascunho podem ser excluídas', 400);
        }

        await prisma.purchase.delete({ where: { id } });
    },

    /**
     * Estatísticas de compras
     */
    async getStats() {
        const [total, pending, paid, totalValue] = await Promise.all([
            prisma.purchase.count(),
            prisma.purchase.count({ where: { status: 'PENDING' } }),
            prisma.purchase.count({ where: { status: 'PAID' } }),
            prisma.purchase.aggregate({
                where: { status: 'PAID' },
                _sum: { total: true },
            }),
        ]);

        return {
            total,
            pending,
            paid,
            totalValue: totalValue._sum.total || 0,
        };
    },
};