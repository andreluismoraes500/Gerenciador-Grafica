// backend/src/services/transactions.service.ts
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

const prismaClient = prisma as any;

export const transactionsService = {
  async list({ page, limit, type, status, from, to }: any) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    
    // ✅ CORREÇÃO: Usar paidAt para filtrar por data de pagamento
    if (from || to) {
      where.paidAt = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined
      };
    }

    const [data, total] = await Promise.all([
      prismaClient.transaction.findMany({
        where,
        include: { order: true, client: true, supplier: true },
        orderBy: { paidAt: 'desc' }, // ✅ Ordenar por paidAt
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismaClient.transaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async create(data: any) {
    return prismaClient.transaction.create({ 
      data: { 
        ...data, 
        dueDate: new Date(data.dueDate),
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined
      } 
    });
  },

  async updateStatus(id: string, status: string) {
    const paidAt = status === 'PAID' ? new Date() : null;
    return prismaClient.transaction.update({ 
      where: { id }, 
      data: { 
        status: status as any, 
        paidAt 
      } 
    });
  },

  async delete(id: string) {
    const existing = await prismaClient.transaction.findUnique({ where: { id } });
    if (!existing) throw new AppError('Transação não encontrada', 404);
    await prismaClient.transaction.delete({ where: { id } });
  },

  async getSummary() {
    const income = await prismaClient.transaction.aggregate({ 
      where: { 
        type: 'INCOME', 
        status: 'PAID' 
      }, 
      _sum: { amount: true } 
    });
    
    const expense = await prismaClient.transaction.aggregate({ 
      where: { 
        type: 'EXPENSE', 
        status: 'PAID' 
      }, 
      _sum: { amount: true } 
    });
    
    const pending = await prismaClient.transaction.aggregate({ 
      where: { 
        status: 'PENDING' 
      }, 
      _sum: { amount: true } 
    });

    return {
      totalIncome: income._sum.amount || 0,
      totalExpense: expense._sum.amount || 0,
      balance: (income._sum.amount || 0) - (expense._sum.amount || 0),
      pendingBalance: pending._sum.amount || 0
    };
  }
};