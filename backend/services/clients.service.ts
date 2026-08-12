import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

interface ListParams {
  page: number;
  limit: number;
  search?: string;
  tag?: string;
}

export const clientsService = {
  async list({ page, limit, search, tag }: ListParams) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tag) where.tags = { has: tag };
    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: { address: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { address: true, projects: true, orders: true, quotes: true },
    });
    if (!client) throw new AppError('Client not found', 404);
    return client;
  },

  async create(data: any, _createdBy: string) {
    console.log('[clients.service] CREATE v3 chamado para:', data?.email);

    const existing = await prisma.client.findFirst({
      where: { OR: [{ email: data.email }, { document: data.document }] },
    });
    if (existing) {
      throw new AppError('Client with this email or document already exists', 409);
    }

    const tempPassword = randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const { address, ...clientData } = data;

    //  OPERAÇÃO ÚNICA E ATÔMICA: Client + User juntos.
    // Se qualquer coisa falhar, NADA é criado (nunca mais usuário órfão).
    const client = await prisma.client.create({
      data: {
        ...clientData,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        user: {
          create: {
            name: data.name,
            email: data.email,
            password: passwordHash,
            role: 'CLIENT',
          },
        },
        address: address ? { create: address } : undefined,
      },
      include: { address: true, user: true },
    });

    console.log('[clients.service] CREATE v3 OK →', client.id);
    return client;
  },

  async update(id: string, data: any, _updatedBy: string) {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) throw new AppError('Client not found', 404);
    const { address, ...clientData } = data;
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...clientData,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        address: address
          ? { upsert: { create: address, update: address } }
          : undefined,
      },
      include: { address: true },
    });
    return client;
  },

  async delete(id: string, _deletedBy: string) {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) throw new AppError('Client not found', 404);
    await prisma.client.delete({ where: { id } });
  },

  async getOrders(clientId: string) {
    return prisma.order.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  },

  async getProjects(clientId: string) {
    return prisma.project.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  },

  async getQuotes(clientId: string) {
    return prisma.quote.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  },

  async getStats() {
    const [total, withActiveOrders, newThisMonth] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { orders: { some: {} } } }),
      prisma.client.count({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
    ]);
    return { total, withActiveOrders, newThisMonth };
  },
};