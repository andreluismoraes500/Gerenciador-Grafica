import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export const suppliersService = {
  async list({ page, limit, search }: { page: number; limit: number; search?: string }) {
    const where: any = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { document: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.supplier.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({ where: { id }, include: { purchases: true } });
    if (!supplier) throw new AppError('Supplier not found', 404);
    return supplier;
  },

  async create(data: any) {
    return prisma.supplier.create({ data });
  },

  async update(id: string, data: any) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new AppError('Supplier not found', 404);
    return prisma.supplier.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new AppError('Supplier not found', 404);
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
  },

  async getPurchases(supplierId: string) {
    return prisma.purchase.findMany({ where: { supplierId }, orderBy: { createdAt: 'desc' } });
  },

  async createPurchase(supplierId: string, data: { items: any[]; total: number; dueDate?: string }) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const count = await prisma.purchase.count();
    const code = `COMP-${String(count + 1).padStart(6, '0')}`;

    return prisma.purchase.create({
      data: {
        code,
        supplierId,
        items: data.items,
        total: data.total,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  },

  async markPurchaseAsPaid(purchaseId: string) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new AppError('Purchase not found', 404);
    return prisma.purchase.update({ where: { id: purchaseId }, data: { status: 'PAID', paidAt: new Date() } });
  },
};
