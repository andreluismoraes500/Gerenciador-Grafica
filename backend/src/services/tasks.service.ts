import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export const tasksService = {
  async list({ page, limit, status, projectId, assigneeId }: { page: number; limit: number; status?: string; projectId?: string; assigneeId?: string }) {
    const where: any = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { project: true, assignee: true, creator: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const task = await prisma.task.findUnique({ where: { id }, include: { project: true, assignee: true, creator: true } });
    if (!task) throw new AppError('Task not found', 404);
    return task;
  },

  async create(data: any, creatorId: string) {
    return prisma.task.create({
      data: { ...data, creatorId, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      include: { project: true, assignee: true },
    });
  },

  async update(id: string, data: any) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError('Task not found', 404);
    return prisma.task.update({
      where: { id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
  },

  async delete(id: string) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError('Task not found', 404);
    await prisma.task.delete({ where: { id } });
  },

  async updateStatus(id: string, status: string) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError('Task not found', 404);
    return prisma.task.update({
      where: { id },
      data: { status: status as any, completedAt: status === 'DONE' ? new Date() : existing.completedAt },
    });
  },

  async getMyTasks(userId: string) {
    return prisma.task.findMany({
      where: { assigneeId: userId, status: { not: 'DONE' } },
      include: { project: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  async getStats() {
    const [todo, inProgress, done, overdue] = await Promise.all([
      prisma.task.count({ where: { status: 'TODO' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
    ]);
    return { todo, inProgress, done, overdue };
  },
};
