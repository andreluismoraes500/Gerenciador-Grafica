// backend/src/services/clients.service.ts
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
    try {
      // Normalizar documento removendo pontuação
      const cleanDocument = data.document.replace(/[^\d]/g, '');
      
      // Verificar se já existe cliente com este documento ou email
      const existingClient = await prisma.client.findFirst({
        where: { 
          OR: [
            { document: cleanDocument },
            ...(data.email ? [{ email: data.email }] : [])
          ]
        },
      });
      
      if (existingClient) {
        throw new AppError('Cliente com este documento ou email já existe', 409);
      }
      
      // Verificar se já existe usuário com este email
      if (data.email) {
        const existingUser = await prisma.user.findUnique({ 
          where: { email: data.email } 
        });
        if (existingUser) {
          throw new AppError('Já existe um usuário cadastrado com este e-mail', 409);
        }
      }
      
      const { address, ...clientData } = data;
      const tempPassword = randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      
      // Se não tem email, gerar um fictício baseado no documento
      const email = data.email || `${cleanDocument}@cliente.local`;
      
      const client = await prisma.$transaction(async (tx) => {
        // Criar usuário para o cliente
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: email,
            password: passwordHash,
            role: 'CLIENT',
          },
        });
        
        // Criar o cliente vinculado ao usuário
        return tx.client.create({
          data: {
            ...clientData,
            document: cleanDocument,
            email: email, // Garantir que email não seja vazio
            userId: user.id,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            address: address ? { 
              create: {
                ...address,
                // Garantir campos obrigatórios
                street: address.street || 'Não informado',
                number: address.number || 'S/N',
                district: address.district || 'Não informado',
                city: address.city || 'Não informado',
                state: address.state || 'SP',
                zipCode: address.zipCode || '00000-000',
              }
            } : undefined,
          },
          include: { address: true },
        });
      });
      
      return client;
    } catch (error) {
      console.error('[clients.service] Erro ao criar cliente:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Erro interno ao criar cliente', 500);
    }
  },

  async update(id: string, data: any, _updatedBy: string) {
    try {
      const existing = await prisma.client.findUnique({ where: { id } });
      if (!existing) throw new AppError('Client not found', 404);

      const { address, ...clientData } = data;

      // Normalizar documento se fornecido
      if (data.document) {
        clientData.document = data.document.replace(/[^\d]/g, '');
      }

      // Mantém o User (login do cliente) sincronizado
      const client = await prisma.$transaction(async (tx) => {
        if (data.name || data.email) {
          await tx.user.update({
            where: { id: existing.userId },
            data: {
              ...(data.name ? { name: data.name } : {}),
              ...(data.email ? { email: data.email } : {}),
            },
          });
        }

        return tx.client.update({
          where: { id },
          data: {
            ...clientData,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            address: address
              ? {
                  upsert: {
                    create: {
                      ...address,
                      street: address.street || 'Não informado',
                      number: address.number || 'S/N',
                      district: address.district || 'Não informado',
                      city: address.city || 'Não informado',
                      state: address.state || 'SP',
                      zipCode: address.zipCode || '00000-000',
                    },
                    update: address,
                  },
                }
              : undefined,
          },
          include: { address: true },
        });
      });

      return client;
    } catch (error) {
      console.error('[clients.service] Erro ao atualizar cliente:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Erro interno ao atualizar cliente', 500);
    }
  },

  async delete(id: string, _deletedBy: string) {
    try {
      const existing = await prisma.client.findUnique({
        where: { id },
        include: {
          _count: { select: { orders: true, projects: true, quotes: true } },
        },
      });
      if (!existing) throw new AppError('Client not found', 404);

      const { orders, projects, quotes } = existing._count;
      if (orders > 0 || projects > 0 || quotes > 0) {
        throw new AppError(
          'Não é possível excluir este cliente pois existem pedidos, projetos ou orçamentos vinculados a ele.',
          409,
        );
      }

      // Exclui o Client e o User (login do cliente) juntos
      await prisma.$transaction([
        prisma.client.delete({ where: { id } }),
        prisma.user.delete({ where: { id: existing.userId } }),
      ]);
    } catch (error) {
      console.error('[clients.service] Erro ao excluir cliente:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Erro interno ao excluir cliente', 500);
    }
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