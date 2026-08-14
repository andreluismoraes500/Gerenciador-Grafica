import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export const notificationsService = {
  async list(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false }
    });
  },

  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    
    if (!notification) {
      throw new AppError('Notificação não encontrada', 404);
    }
    
    return prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  },

  async delete(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    
    if (!notification) {
      throw new AppError('Notificação não encontrada', 404);
    }
    
    await prisma.notification.delete({ where: { id } });
  },

  async deleteAll(userId: string) {
    await prisma.notification.deleteMany({
      where: { userId }
    });
  },

  // Cria notificação para um único usuário
  async create(
    userId: string, 
    data: {
      title: string;
      message: string;
      type: NotificationType;
      metadata?: any;
    }
  ) {
    return prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
      }
    });
  },

  // Cria notificação para múltiplos usuários
  async createForMany(
    userIds: string[],
    data: {
      title: string;
      message: string;
      type: NotificationType;
      metadata?: any;
    }
  ) {
    if (userIds.length === 0) return [];
    
    // Evita criar notificações duplicadas para o mesmo usuário
    const uniqueUserIds = [...new Set(userIds)];
    
    return prisma.notification.createMany({
      data: uniqueUserIds.map(userId => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
      })),
    });
  },

  // Busca todos os IDs de usuários da equipe
  async getTeamUserIds(excludeUserId?: string): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'ATTENDANT', 'DESIGNER'] },
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return users.map(u => u.id);
  },

  // Notifica toda a equipe
  async notifyTeam(
    actorUserId: string,
    data: {
      title: string;
      message: string;
      type: NotificationType;
      metadata?: any;
    }
  ) {
    const teamIds = await this.getTeamUserIds(actorUserId);
    return this.createForMany(teamIds, data);
  },

  // Notifica sobre baixo estoque
  async notifyLowStock(productName: string, sku: string, stock: number, minStock: number) {
    const teamIds = await this.getTeamUserIds();
    return this.createForMany(teamIds, {
      title: '⚠️ Estoque Baixo',
      message: `Produto "${productName}" (${sku}) está com apenas ${stock} unidades. Mínimo: ${minStock}`,
      type: 'WARNING',
      metadata: { entity: 'Product', route: '/products' }
    });
  }
};