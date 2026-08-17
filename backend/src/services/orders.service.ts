// backend/src/services/orders.service.ts
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { productsService } from './products.service';
import { notificationsService } from './notifications.service';
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
      include: { 
        client: true, 
        items: { include: { product: true } }, 
        invoices: true, 
        project: true,
        transactions: true,
      },
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

    // Baixa de estoque dos produtos
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

  async update(id: string, data: any) {
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
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!existing) throw new AppError('Order not found', 404);

    // Se for para produção, deduz estoque de insumos
    if (status === 'IN_PRODUCTION' && existing.status !== 'IN_PRODUCTION') {
      // Busca insumos relacionados aos produtos do pedido
      const productIds = existing.items.map(i => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      });

      // Agrupa por categoria para deduzir insumos
      for (const product of products) {
        if (product.categoryId) {
          const stockItems = await prisma.stockItem.findMany({
            where: {
              category: product.category?.name || undefined,
              isActive: true,
            },
          });

          for (const stockItem of stockItems) {
            // Deduz uma quantidade baseada na quantidade do pedido
            const orderItem = existing.items.find(i => i.productId === product.id);
            if (orderItem) {
              const amountToDeduct = orderItem.quantity * 1; // 1 unidade de insumo por produto
              await prisma.$transaction(async (tx) => {
                const current = await tx.stockItem.findUnique({
                  where: { id: stockItem.id },
                });
                if (current && current.quantity >= amountToDeduct) {
                  await tx.stockItem.update({
                    where: { id: stockItem.id },
                    data: { quantity: { decrement: amountToDeduct } },
                  });
                } else if (current) {
                  throw new AppError(
                    `Estoque insuficiente de "${stockItem.name}". Disponível: ${current?.quantity || 0} ${stockItem.unit}`,
                    400
                  );
                }
              });
            }
          }
        }
      }
    }

    return prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        deliveredAt: status === 'DELIVERED' ? new Date() : existing.deliveredAt,
        productionStep: status === 'IN_PRODUCTION' ? 'PRINTING' : existing.productionStep,
      },
      include: { client: true },
    });
  },

  /**
   * Update payment status with automatic financial integration
   * ✅ CORREÇÃO: Garantir que paidAt seja preenchido corretamente
   */
  async updatePaymentStatus(id: string, paymentStatus: string) {
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!existing) throw new AppError('Pedido não encontrado', 404);

    // Se for PAID, cria transação financeira automaticamente
    if (paymentStatus === 'PAID') {
      const paidAt = new Date(); // ✅ Data do pagamento

      await prisma.$transaction(async (tx) => {
        // Verifica se já existe uma transação para este pedido
        const existingTransaction = await tx.transaction.findFirst({
          where: { 
            orderId: existing.id,
            type: 'INCOME',
          },
        });

        if (!existingTransaction) {
          await tx.transaction.create({
            data: {
              type: 'INCOME',
              category: 'Venda de Pedido',
              description: `Receita do Pedido ${existing.code} - ${existing.client?.name || ''}`,
              amount: existing.total,
              dueDate: paidAt,
              paidAt: paidAt, // ✅ Garantir que paidAt seja preenchido
              status: 'PAID',
              orderId: existing.id,
              clientId: existing.clientId,
            },
          });
        }

        // ✅ Atualiza o pedido com paidAt
        await tx.order.update({
          where: { id },
          data: { 
            paymentStatus: 'PAID', 
            paidAt: paidAt // ✅ GARANTIR QUE SEJA PREENCHIDO
          },
        });
      });

      // Notifica a equipe sobre o pagamento
      await notificationsService.notifyTeam('', {
        title: '💳 Pagamento confirmado',
        message: `Pedido ${existing.code} foi pago — R$ ${existing.total.toFixed(2)}`,
        type: 'SUCCESS',
        metadata: { entity: 'Order', entityId: existing.id, route: '/orders' },
      });
    } else if (paymentStatus === 'REFUNDED') {
      // Cria transação de reembolso (despesa)
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            type: 'EXPENSE',
            category: 'Reembolso',
            description: `Reembolso do Pedido ${existing.code} - ${existing.client?.name || ''}`,
            amount: existing.total,
            dueDate: new Date(),
            paidAt: new Date(),
            status: 'PAID',
            orderId: existing.id,
            clientId: existing.clientId,
          },
        });
      });

      await notificationsService.notifyTeam('', {
        title: '🔄 Reembolso realizado',
        message: `Pedido ${existing.code} teve reembolso processado.`,
        type: 'WARNING',
        metadata: { entity: 'Order', entityId: existing.id, route: '/orders' },
      });
    }

    return prisma.order.findUnique({
      where: { id },
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
          prisma.order.count({ 
            where: { 
              createdAt: { gte: monthStart, lt: monthEnd } 
            } 
          }),
          prisma.order.aggregate({
            where: { 
              paidAt: { gte: monthStart, lt: monthEnd }, // ✅ Usar paidAt
              paymentStatus: 'PAID' 
            },
            _sum: { total: true },
          }),
        ]);
        return { 
          month: monthStart, 
          orders: count, 
          revenue: revenue._sum.total || 0 
        };
      }),
    );

    return stats.reverse();
  }
};