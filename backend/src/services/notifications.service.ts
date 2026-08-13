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

  // Cria notificação para múltiplos usuários (ex: todos os admins)
  async createForMany(
    userIds: string[],
    data: {
      title: string;
      message: string;
      type: NotificationType;
      metadata?: any;
    }
  ) {
    if (userIds.length === 0) return;
    
    await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
      })),
    });
  },

  // Helper: busca todos os admins e atendentes (equipe interna)
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

  // Helper: notifica a equipe toda (exceto quem fez a ação)
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
    await this.createForMany(teamIds, data);
  },
};