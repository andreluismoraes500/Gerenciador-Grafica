import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { notificationsService } from './notifications.service';

const stockItemModel = (prisma as any).stockItem ?? (prisma as any).stockItems;

export const stockItemsService = {
  async list({ page, limit, search }: any) {
    const where: any = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      stockItemModel.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      stockItemModel.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  async create(data: any) { return stockItemModel.create({ data }); },
  async update(id: string, data: any) { return stockItemModel.update({ where: { id }, data }); },
  async delete(id: string) { await stockItemModel.update({ where: { id }, data: { isActive: false } }); },
  
  async deductStock(itemId: string, amount: number) {
    const item = await stockItemModel.findUnique({ where: { id: itemId } });
    if (!item) throw new AppError('Insumo não encontrado', 404);
    if (item.quantity < amount) throw new AppError(`Estoque insuficiente de ${item.name}`, 400);
    
    const updated = await stockItemModel.update({
      where: { id: itemId },
      data: { quantity: { decrement: amount } }
    });

    if (updated.quantity <= updated.minStock) {
      await notificationsService.notifyTeam('', {
        title: '⚠️ Estoque baixo de insumos',
        message: `O insumo "${item.name}" está com estoque baixo (${updated.quantity} ${item.unit}).`,
        type: 'WARNING',
        metadata: { entity: 'StockItem', entityId: item.id, route: '/stock' },
      });
    }
    return updated;
  }
};