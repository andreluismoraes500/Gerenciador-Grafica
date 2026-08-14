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

function calcMargin(costPrice: number, salePrice: number) {
  if (!costPrice) return 0;
  return ((salePrice - costPrice) / costPrice) * 100;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const productsService = {
  async list({ page, limit, search, category, isActive }: ListParams) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!product) throw new AppError('Product not found', 404);
    return product;
  },

  async create(data: any, _createdBy: string) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError('SKU already in use', 409);

    const product = await prisma.product.create({
      data: {
        ...data,
        margin: calcMargin(data.costPrice, data.salePrice),
      },
    });
    return product;
  },

  async update(id: string, data: any, _updatedBy: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError('Product not found', 404);

    const costPrice = data.costPrice ?? existing.costPrice;
    const salePrice = data.salePrice ?? existing.salePrice;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        margin: calcMargin(costPrice, salePrice),
      },
    });
    return product;
  },

  async delete(id: string, _deletedBy: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError('Product not found', 404);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
  },

  async listCategories() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },

  async createCategory({ name, description, parentId }: { name: string; description?: string; parentId?: string }) {
    const slug = slugify(name);
    const existing = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } });
    if (existing) throw new AppError('Category already exists', 409);

    return prisma.category.create({ data: { name, slug, description, parentId } });
  },

  async updateStock(id: string, quantity: number) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError('Produto não encontrado', 404);

    const newStock = product.stock + quantity;
    if (newStock < 0) throw new AppError('Estoque insuficiente', 400);

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: newStock }
    });

    // Notifica se estoque ficou baixo
    if (updated.stock <= updated.minStock) {
      await this.checkAndNotifyLowStock(id);
    }

    return updated;
  },

  /**
   * Busca produtos com estoque baixo
   */
  async getLowStock() {
    return prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: prisma.product.fields.minStock }
      },
      include: { category: true }
    });
  },

  /**
   * Verifica e notifica sobre estoque baixo
   */
  async checkAndNotifyLowStock(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, stock: true, minStock: true }
    });

    if (!product) return;

    if (product.stock <= product.minStock) {
      await notificationsService.notifyTeam('', {
        title: '⚠️ Estoque Baixo',
        message: `Produto "${product.name}" (${product.sku}) está com apenas ${product.stock} unidades. Mínimo: ${product.minStock}`,
        type: 'WARNING',
        metadata: { entity: 'Product', entityId: product.id, route: '/products' }
      });
    }
  }
};
