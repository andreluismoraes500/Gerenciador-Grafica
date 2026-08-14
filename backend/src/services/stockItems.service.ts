import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { notificationsService } from './notifications.service';

export const stockItemsService = {
  async list({ page, limit, search }: any) {
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await Promise.all([
      prisma.stockItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockItem.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const item = await prisma.stockItem.findUnique({ where: { id } });
    if (!item) throw new AppError('Insumo não encontrado', 404);
    return item;
  },

  async create(data: any) {
    return prisma.stockItem.create({ data });
  },

  async update(id: string, data: any) {
    const existing = await prisma.stockItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('Insumo não encontrado', 404);
    return prisma.stockItem.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.stockItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('Insumo não encontrado', 404);
    await prisma.stockItem.update({ where: { id }, data: { isActive: false } });
  },

  /**
   * Deduct stock from a stock item
   * @param itemId - ID of the stock item
   * @param amount - Amount to deduct
   * @param _reason - Optional reason for the deduction
   */
  async deductStock(itemId: string, amount: number, _reason?: string) {
    const item = await prisma.stockItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AppError('Insumo não encontrado', 404);
    if (amount <= 0) throw new AppError('A quantidade a deduzir deve ser maior que zero', 400);
    if (item.quantity < amount) {
      throw new AppError(
        `Estoque insuficiente de "${item.name}". Disponível: ${item.quantity} ${item.unit}, Necessário: ${amount} ${item.unit}`,
        400
      );
    }

    const updated = await prisma.stockItem.update({
      where: { id: itemId },
      data: { quantity: { decrement: amount } },
    });

    // Verifica se atingiu o estoque mínimo
    if (updated.quantity <= updated.minStock) {
      await notificationsService.notifyTeam('', {
        title: '⚠️ Estoque baixo de insumo',
        message: `O insumo "${item.name}" está com estoque baixo (${updated.quantity} ${item.unit}). Mínimo: ${updated.minStock} ${item.unit}.`,
        type: 'WARNING',
        metadata: { entity: 'StockItem', entityId: item.id, route: '/stock' },
      });
    }

    return updated;
  },

  /**
   * Add stock to a stock item
   */
  async addStock(itemId: string, amount: number, _reason?: string) {
    if (amount <= 0) throw new AppError('A quantidade a adicionar deve ser maior que zero', 400);

    return prisma.stockItem.update({
      where: { id: itemId },
      data: { quantity: { increment: amount } },
    });
  },

  /**
   * Bulk stock deduction - useful for production orders
   */
  async bulkDeductStock(items: Array<{ itemId: string; amount: number }>, reason?: string) {
    const results = [];
    for (const { itemId, amount } of items) {
      const result = await this.deductStock(itemId, amount, reason);
      results.push(result);
    }
    return results;
  },

  /**
   * Get low stock items
   */
  async getLowStockItems() {
    return prisma.stockItem.findMany({
      where: {
        isActive: true,
        quantity: { lte: prisma.stockItem.fields.minStock },
      },
    });
  },

  /**
   * Get stock summary for dashboard
   */
  async getStockSummary() {
    const [totalItems, lowStockCount, totalValue] = await Promise.all([
      prisma.stockItem.count({ where: { isActive: true } }),
      prisma.stockItem.count({
        where: {
          isActive: true,
          quantity: { lte: prisma.stockItem.fields.minStock },
        },
      }),
      prisma.stockItem.aggregate({
        where: { isActive: true },
        _sum: { unitCost: true },
      }),
    ]);

    return {
      totalItems,
      lowStockCount,
      totalValue: totalValue._sum.unitCost || 0,
      hasLowStock: lowStockCount > 0,
    };
  },
};