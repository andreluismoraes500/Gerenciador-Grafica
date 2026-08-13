import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export const notificationsService = {
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
  }
};