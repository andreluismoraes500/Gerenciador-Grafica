// backend/src/services/kits.service.ts

import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

interface KitItemInput {
    productId: string;
    quantity: number;
}

interface CreateKitData {
    name: string;
    description?: string;
    price?: number; // Se não informado, calcula automaticamente
    isActive?: boolean;
    items: KitItemInput[];
}

interface UpdateKitData {
    name?: string;
    description?: string;
    price?: number;
    isActive?: boolean;
    items?: KitItemInput[];
}

export const kitsService = {
    /**
     * Listar kits com filtros
     */
    async list({ page = 1, limit = 20, search, isActive }: {
        page: number;
        limit: number;
        search?: string;
        isActive?: boolean;
    }) {
        const where: any = {};
        if (isActive !== undefined) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.kit.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.kit.count({ where }),
        ]);

        // Formata os itens para exibição
        const formattedData = data.map(kit => ({
            ...kit,
            totalItems: kit.items.reduce((sum, item) => sum + item.quantity, 0),
            productCount: kit.items.length,
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
     * Buscar kit por ID
     */
    async getById(id: string) {
        const kit = await prisma.kit.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!kit) {
            throw new AppError('Kit não encontrado', 404);
        }

        // Calcula o preço total dos itens
        const itemsTotal = kit.items.reduce(
            (sum, item) => sum + (item.product.salePrice * item.quantity),
            0
        );

        return {
            ...kit,
            calculatedPrice: itemsTotal,
            totalItems: kit.items.reduce((sum, item) => sum + item.quantity, 0),
            productCount: kit.items.length,
        };
    },

    /**
     * Criar novo kit
     */
    async create(data: CreateKitData) {
        if (!data.items || data.items.length === 0) {
            throw new AppError('Adicione pelo menos um produto ao kit', 400);
        }

        // Verifica se os produtos existem e estão ativos
        const productIds = data.items.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: { 
                id: { in: productIds },
                isActive: true,
            },
        });

        if (products.length !== productIds.length) {
            throw new AppError('Um ou mais produtos não foram encontrados ou estão inativos', 400);
        }

        // Calcula o preço do kit com base nos produtos
        let calculatedPrice = 0;
        const productMap = new Map(products.map(p => [p.id, p]));
        
        for (const item of data.items) {
            const product = productMap.get(item.productId);
            if (!product) continue;
            calculatedPrice += product.salePrice * item.quantity;
        }

        // Usa o preço informado ou o calculado
        const finalPrice = data.price !== undefined ? data.price : calculatedPrice;

        // Cria o kit com transação
        const kit = await prisma.$transaction(async (tx) => {
            const createdKit = await tx.kit.create({
                data: {
                    name: data.name,
                    description: data.description,
                    price: finalPrice,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                },
            });

            // Cria os itens do kit
            await tx.kitItem.createMany({
                data: data.items.map(item => ({
                    kitId: createdKit.id,
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            });

            return createdKit;
        });

        // Busca o kit completo com os itens
        return this.getById(kit.id);
    },

    /**
     * Atualizar kit
     */
    async update(id: string, data: UpdateKitData) {
        const existing = await prisma.kit.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!existing) {
            throw new AppError('Kit não encontrado', 404);
        }

        // Se for desativar, verifica se há pedidos usando o kit
        if (data.isActive === false) {
            const usedInOrders = await prisma.orderItem.findFirst({
                where: {
                    product: {
                        kits: {
                            some: {
                                kitId: id,
                            },
                        },
                    },
                },
            });

            if (usedInOrders) {
                throw new AppError(
                    'Não é possível desativar este kit, ele está sendo usado em pedidos',
                    400
                );
            }
        }

        // Se os itens foram alterados, recalcula o preço
        let finalPrice = data.price;

        if (data.items && data.items.length > 0) {
            // Verifica os produtos
            const productIds = data.items.map(item => item.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, isActive: true },
            });

            if (products.length !== productIds.length) {
                throw new AppError('Um ou mais produtos não foram encontrados', 400);
            }

            // Calcula novo preço
            let calculatedPrice = 0;
            const productMap = new Map(products.map(p => [p.id, p]));
            
            for (const item of data.items) {
                const product = productMap.get(item.productId);
                if (product) {
                    calculatedPrice += product.salePrice * item.quantity;
                }
            }

            finalPrice = data.price !== undefined ? data.price : calculatedPrice;
        }

        // Atualiza com transação
        const updatedKit = await prisma.$transaction(async (tx) => {
            // Atualiza dados principais
            const kit = await tx.kit.update({
                where: { id },
                data: {
                    name: data.name ?? existing.name,
                    description: data.description !== undefined ? data.description : existing.description,
                    price: finalPrice ?? existing.price,
                    isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
                },
            });

            // Se os itens foram fornecidos, atualiza
            if (data.items && data.items.length > 0) {
                // Remove itens antigos
                await tx.kitItem.deleteMany({
                    where: { kitId: id },
                });

                // Cria novos itens
                await tx.kitItem.createMany({
                    data: data.items.map(item => ({
                        kitId: id,
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                });
            }

            return kit;
        });

        return this.getById(updatedKit.id);
    },

    /**
     * Excluir kit (apenas se não estiver em uso)
     */
    async delete(id: string) {
        const existing = await prisma.kit.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!existing) {
            throw new AppError('Kit não encontrado', 404);
        }

        // Verifica se está sendo usado em pedidos
        const usedInOrders = await prisma.orderItem.findFirst({
            where: {
                product: {
                    kits: {
                        some: {
                            kitId: id,
                        },
                    },
                },
            },
        });

        if (usedInOrders) {
            // Em vez de excluir, desativa
            await prisma.kit.update({
                where: { id },
                data: { isActive: false },
            });
            return { deleted: false, deactivated: true };
        }

        await prisma.kit.delete({
            where: { id },
        });

        return { deleted: true };
    },

    /**
     * Calcular preço de um kit baseado nos produtos
     */
    async calculatePrice(kitId: string) {
        const kit = await prisma.kit.findUnique({
            where: { id: kitId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!kit) {
            throw new AppError('Kit não encontrado', 404);
        }

        const total = kit.items.reduce(
            (sum, item) => sum + (item.product.salePrice * item.quantity),
            0
        );

        return {
            kitId: kit.id,
            kitName: kit.name,
            calculatedPrice: total,
            currentPrice: kit.price,
            items: kit.items.map(item => ({
                productName: item.product.name,
                quantity: item.quantity,
                unitPrice: item.product.salePrice,
                total: item.product.salePrice * item.quantity,
            })),
        };
    },

    /**
     * Verificar disponibilidade de estoque para um kit
     */
    async checkAvailability(kitId: string, quantity: number = 1) {
        const kit = await prisma.kit.findUnique({
            where: { id: kitId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!kit) {
            throw new AppError('Kit não encontrado', 404);
        }

        const availability: any[] = [];
        let isAvailable = true;

        for (const item of kit.items) {
            const needed = item.quantity * quantity;
            const available = item.product.stock;
            const status = available >= needed;

            availability.push({
                productId: item.productId,
                productName: item.product.name,
                needed,
                available,
                status,
                isAvailable: status,
            });

            if (!status) isAvailable = false;
        }

        return {
            kitId: kit.id,
            kitName: kit.name,
            quantity,
            isAvailable,
            items: availability,
        };
    },

    /**
     * Estatísticas de kits
     */
    async getStats() {
        const [total, active, inactive, totalItems] = await Promise.all([
            prisma.kit.count(),
            prisma.kit.count({ where: { isActive: true } }),
            prisma.kit.count({ where: { isActive: false } }),
            prisma.kitItem.count(),
        ]);

        return {
            total,
            active,
            inactive,
            totalItems,
        };
    },

    /**
     * Buscar produtos que podem ser adicionados a kits
     * (apenas produtos ativos e que não estão em kits com limite)
     */
    async getAvailableProducts(search?: string) {
        const where: any = { isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        return prisma.product.findMany({
            where,
            select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                stock: true,
                images: true,
            },
            orderBy: { name: 'asc' },
            take: 50,
        });
    },
};