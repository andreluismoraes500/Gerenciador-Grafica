import { prisma } from '../config/database';

export async function logActivity(
  userId: string | null | undefined,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: Record<string, any>,
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId || undefined,
        action,
        entity,
        entityId,
        metadata,
      },
    });
  } catch (err) {
    // Não deixamos falha de log de atividade quebrar a requisição principal
    console.error('[activity.service] Failed to log activity:', err);
  }
}
