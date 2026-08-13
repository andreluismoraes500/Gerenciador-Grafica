import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { productsService } from './products.service';
import { startOfMonth, subMonths } from 'date-fns';

interface ListParams {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  from?: Date;
  to?: Date;
  userId: string;
  role: string;
}

async function generateOrderCode() {
  const count = await prisma.order.count();
  return `PED-${String(count + 1).padStart(6, '0')}`;
}

export const ordersService = {
  async list({ page, limit, status, search, from, to, userId, role }: ListParams) {
    const where: any = {};
    if (status) where.status = status;
    if (from || to) where.createdAt = { gte: from, lte: to };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId } });
      where.clientId = client?.id ?? '__none__';
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { client: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { client: true, items: { include: { product: true } }, invoices: true, project: true },
    });
    if (!order) throw new AppError('Order not found', 404);
    return order;
  },

  async create(data: any, creatorId: string) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new AppError('Client not found', 404);

    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i: any) => i.productId) } },
    });
    if (products.length !== data.items.length) throw new AppError('One or more products not found', 400);

    

    const itemsWithTotal = data.items.map((item: any) => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
    }));

    const subtotal = itemsWithTotal.reduce((sum: number, i: any) => sum + i.totalPrice, 0);
    const total = subtotal + (data.shippingCost || 0) - (data.discount || 0);

    const code = await generateOrderCode();

    const order = await prisma.order.create({
      data: {
        code,
        clientId: data.clientId,
        creatorId,
        subtotal,
        discount: data.discount || 0,
        shippingCost: data.shippingCost || 0,
        total,
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        items: { create: itemsWithTotal },
      },
      include: { client: true, items: { include: { product: true } } },
    });

    // Baixa de estoque
    await Promise.all(
      data.items.map((item: any) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        }),
      ),
    );

    for (const item of data.items) {
      await productsService.checkAndNotifyLowStock(item.productId);
    }

    return order;
  },

  async update(id: string, data: any, _updatedBy: string) {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);

    return prisma.order.update({
      where: { id },
      data: {
        shippingAddress: data.shippingAddress,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        discount: data.discount,
        shippingCost: data.shippingCost,
      },
      include: { client: true, items: { include: { product: true } } },
    });
  },

  async delete(id: string, _deletedBy: string) {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);
    await prisma.order.delete({ where: { id } });
  },

  async updateStatus(id: string, status: string, _updatedBy: string) {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);

    return prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        deliveredAt: status === 'DELIVERED' ? new Date() : existing.deliveredAt,
      },
      include: { client: true },
    });
  },

 async updatePaymentStatus(id: string, paymentStatus: string) {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Pedido não encontrado', 404);

    const data: any = { paymentStatus: paymentStatus as any };

    // Preenche paidAt quando marca como PAID
    if (paymentStatus === 'PAID') {
      data.paidAt = new Date();
    }

    return prisma.order.update({
      where: { id },
      data,
      include: { client: true },
    });
  },

  async getInvoice(orderId: string) {
    const invoice = await prisma.invoice.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  },

  async createInvoice(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Order not found', 404);

    const count = await prisma.invoice.count();
    const number = `NF-${String(count + 1).padStart(6, '0')}`;

    

    return prisma.invoice.create({
      data: { number, orderId, total: order.total, dueDate: order.dueDate },
    });
  },

  async getMonthlyStats() {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => startOfMonth(subMonths(now, i)));

    const stats = await Promise.all(
      months.map(async monthStart => {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        const [count, revenue] = await Promise.all([
          prisma.order.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
          prisma.order.aggregate({
            where: { createdAt: { gte: monthStart, lt: monthEnd }, paymentStatus: 'PAID' },
            _sum: { total: true },
          }),
        ]);
        return { month: monthStart, orders: count, revenue: revenue._sum.total || 0 };
      }),
    );

    return stats.reverse();
  },
};
