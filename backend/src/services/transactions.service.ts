import { prisma } from '../config/database';

const prismaClient = prisma as any;

export const transactionsService = {
  async list({ page, limit, type, status, from, to }: any) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (from || to) where.dueDate = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };

    const [data, total] = await Promise.all([
      prismaClient.transaction.findMany({
        where, include: { order: true, client: true, supplier: true },
        orderBy: { dueDate: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      prismaClient.transaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  async create(data: any) {
    return prismaClient.transaction.create({ data: { ...data, dueDate: new Date(data.dueDate) } });
  },
  async updateStatus(id: string, status: string) {
    const paidAt = status === 'PAID' ? new Date() : null;
    return prismaClient.transaction.update({ where: { id }, data: { status: status as any, paidAt } });
  },
  async delete(id: string) {
    await prismaClient.transaction.delete({ where: { id } });
  },
  async getSummary() {
    const income = await prismaClient.transaction.aggregate({ where: { type: 'INCOME', status: 'PAID' }, _sum: { amount: true } });
    const expense = await prismaClient.transaction.aggregate({ where: { type: 'EXPENSE', status: 'PAID' }, _sum: { amount: true } });
    const pending = await prismaClient.transaction.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } });
    return {
      totalIncome: income._sum.amount || 0,
      totalExpense: expense._sum.amount || 0,
      balance: (income._sum.amount || 0) - (expense._sum.amount || 0),
      pendingBalance: pending._sum.amount || 0
    };
  }
};