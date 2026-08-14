import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { notificationsService } from './notifications.service';

interface ListParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export const productsService = {
  async list({ page, limit, search, category, isActive }: ListParams) {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (category) {
      where.categoryId = category;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, orderItems: true, quoteItems: true },
    });
    if (!product) throw new AppError('Product not found', 404);
    return product;
  },

  async create(data: any, _createdBy: string) {
    // Verifica se SKU já existe
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existing) throw new AppError('SKU already exists', 409);

    // Calcula margem automaticamente
    const margin = data.costPrice > 0 
      ? ((data.salePrice - data.costPrice) / data.costPrice) * 100 
      : 0;

    return prisma.product.create({
      data: {
        ...data,
        margin,
      },
      include: { category: true },
    });
  },

  async update(id: string, data: any, _updatedBy: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError('Product not found', 404);

    // Verifica duplicidade de SKU
    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (duplicate) throw new AppError('SKU already exists', 409);
    }

    // Recalcula margem se preços foram alterados
    const costPrice = data.costPrice ?? existing.costPrice;
    const salePrice = data.salePrice ?? existing.salePrice;
    const margin = costPrice > 0 
      ? ((salePrice - costPrice) / costPrice) * 100 
      : existing.margin;

    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        margin,
      },
      include: { category: true },
    });
  },

  async delete(id: string, _deletedBy: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orderItems: true,
            quoteItems: true,
            kits: true,
          },
        },
      },
    });
    if (!existing) throw new AppError('Product not found', 404);

    // Verifica se o produto está sendo usado em pedidos ou orçamentos
    const { orderItems, quoteItems, kits } = existing._count;
    if (orderItems > 0 || quoteItems > 0 || kits > 0) {
      // Em vez de excluir, apenas desativa
      return prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.product.delete({ where: { id } });
  },

  async listCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  },

  async createCategory(data: { name: string; description?: string; parentId?: string }) {
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await prisma.category.findUnique({
      where: { slug },
    });
    if (existing) throw new AppError('Category with this name already exists', 409);

    return prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        parentId: data.parentId,
      },
    });
  },

  async getLowStock() {
    return prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: prisma.product.fields.minStock },
      },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });
  },

  async updateStock(id: string, quantity: number) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError('Product not found', 404);

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      throw new AppError('Stock cannot be negative', 400);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });

    // Notifica se estoque está baixo
    if (updated.stock <= updated.minStock) {
      await notificationsService.notifyLowStock(
        updated.name,
        updated.sku,
        updated.stock,
        updated.minStock
      );
    }

    return updated;
  },

  async checkAndNotifyLowStock(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (product && product.stock <= product.minStock) {
      await notificationsService.notifyLowStock(
        product.name,
        product.sku,
        product.stock,
        product.minStock
      );
    }
  },
};