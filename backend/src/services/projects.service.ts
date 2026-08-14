import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { notificationsService } from './notifications.service';

interface ListParams {
  page: number;
  limit: number;
  status?: string;
  clientId?: string;
  designerId?: string;
  userId: string;
  role: string;
}

const VALID_STATUSES = ['ANALYSIS', 'CREATING', 'AWAITING_APPROVAL', 'PRODUCTION', 'COMPLETED', 'CANCELLED'];

export const projectsService = {
  async list({ page, limit, status, clientId, designerId, userId, role }: ListParams) {
    const where: any = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (designerId) where.designerId = designerId;

    if (role === 'DESIGNER' && !designerId) where.designerId = userId;
    if (role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId } });
      where.clientId = client?.id ?? '__none__';
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { client: true, designer: true, files: true, order: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        designer: true,
        files: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'asc' }, include: { user: true } },
        approvals: true,
        tasks: true,
        order: {
          include: {
            items: { include: { product: true } }
          }
        },
      },
    });
    if (!project) throw new AppError('Project not found', 404);
    return project;
  },

  async create(data: any, _createdBy: string) {
    const project = await prisma.project.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: { client: true, designer: true },
    });
    return project;
  },

  async update(id: string, data: any, _updatedBy: string) {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new AppError('Project not found', 404);

    return prisma.project.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  },

  async delete(id: string, _deletedBy: string) {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new AppError('Project not found', 404);
    await prisma.project.delete({ where: { id } });
  },

  async updateStatus(id: string, status: string, updatedBy: string) {
    if (!VALID_STATUSES.includes(status)) throw new AppError('Invalid status', 400);

    const existing = await prisma.project.findUnique({ 
      where: { id },
      include: { files: true, order: { include: { items: { include: { product: true } } } } }
    });
    if (!existing) throw new AppError('Project not found', 404);

    // Verifica se o projeto tem arte final antes de ir para produção
    if (status === 'PRODUCTION' || status === 'COMPLETED') {
      const hasFinalArt = existing.files.some(f => f.isFinal);
      if (!hasFinalArt) {
        throw new AppError(
          'O projeto precisa ter uma arte final marcada antes de ser enviado para produção.',
          400
        );
      }
    }

    // Se for concluído, chama completeProject
    if (status === 'COMPLETED') {
      return this.completeProject(id, updatedBy);
    }

    // Se for para produção, atualiza o pedido vinculado
    if (status === 'PRODUCTION' && existing.orderId) {
      await prisma.order.update({
        where: { id: existing.orderId },
        data: { status: 'IN_PRODUCTION' }
      });
    }

    return prisma.project.update({
      where: { id },
      data: {
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt,
      },
    });
  },

  /**
   * Complete project - marks as COMPLETED, updates order status,
   * deducts stock, creates notifications
   */
  async completeProject(projectId: string, completedBy: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        designer: true,
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        files: true,
      },
    });

    if (!project) throw new AppError('Project not found', 404);
    if (project.status === 'COMPLETED') throw new AppError('Project already completed', 400);

    // Verifica arte final
    const hasFinalArt = project.files.some(f => f.isFinal);
    if (!hasFinalArt) {
      throw new AppError(
        'O projeto precisa ter uma arte final marcada antes de ser concluído.',
        400
      );
    }

    // Executa todas as operações em uma transação
    return await prisma.$transaction(async (tx) => {
      // 1. Atualiza o status do projeto
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // 2. Se houver pedido vinculado, atualiza seu status e etapa de produção
      if (project.orderId) {
        await tx.order.update({
          where: { id: project.orderId },
          data: {
            status: 'READY',
            productionStep: 'SHIPPING',
          },
        });

        // 3. DEDUZ ESTOQUE DOS INSUMOS (StockItems)
        // Baseado nos produtos do pedido
        const orderItems = project.order?.items || [];
        for (const item of orderItems) {
          // Busca insumos relacionados ao produto (através de uma relação de composição)
          // Por simplicidade, vamos buscar um insumo genérico baseado na categoria
          const stockItems = await tx.stockItem.findMany({
            where: {
              category: item.product.categoryId ? { equals: item.product.categoryId } : undefined,
              isActive: true,
            },
          });

          if (stockItems.length > 0) {
            // Para demonstração, deduzimos uma quantidade proporcional do primeiro insumo
            // Em produção, você teria uma tabela de BOM (Bill of Materials)
            const amountToDeduct = item.quantity * 1; // 1 unidade por item
            const stockItem = stockItems[0];
            
            if (stockItem.quantity >= amountToDeduct) {
              await tx.stockItem.update({
                where: { id: stockItem.id },
                data: {
                  quantity: { decrement: amountToDeduct },
                },
              });

              // Notifica se o estoque ficou baixo
              if (stockItem.quantity - amountToDeduct <= stockItem.minStock) {
                await notificationsService.notifyTeam(completedBy, {
                  title: '⚠️ Estoque baixo de insumo',
                  message: `O insumo "${stockItem.name}" está com estoque baixo (${stockItem.quantity - amountToDeduct} ${stockItem.unit}).`,
                  type: 'WARNING',
                  metadata: { entity: 'StockItem', entityId: stockItem.id, route: '/stock' },
                });
              }
            } else {
              throw new AppError(
                `Estoque insuficiente para o insumo "${stockItem.name}". Disponível: ${stockItem.quantity}, Necessário: ${amountToDeduct}`,
                400
              );
            }
          }
        }
      }

      // 4. Cria notificações
      // Notifica o designer que o projeto foi concluído
      if (project.designerId) {
        await notificationsService.create(project.designerId, {
          title: '✅ Projeto concluído',
          message: `O projeto "${project.title}" foi concluído e está pronto para entrega.`,
          type: 'SUCCESS',
          metadata: { entity: 'Project', entityId: projectId, route: '/projects' },
        });
      }

      // Notifica a equipe
      await notificationsService.notifyTeam(completedBy, {
        title: '📦 Projeto finalizado',
        message: `"${project.title}" foi concluído${project.client ? ` para ${project.client.name}` : ''}.`,
        type: 'SUCCESS',
        metadata: { entity: 'Project', entityId: projectId, route: '/projects' },
      });

      return updatedProject;
    });
  },

  async uploadFiles(projectId: string, files: Express.Multer.File[], uploadedBy: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError('Project not found', 404);
    if (!files || files.length === 0) throw new AppError('No files provided', 400);

    const created = await prisma.$transaction(
      files.map(file =>
        prisma.projectFile.create({
          data: {
            projectId,
            name: file.originalname,
            url: `/uploads/${file.filename}`,
            type: (file.originalname.split('.').pop() || '').toUpperCase(),
            size: file.size,
            uploadedBy,
          },
        }),
      ),
    );

    return created;
  },

  async deleteFile(projectId: string, fileId: string, _deletedBy: string) {
    const file = await prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
    if (!file) throw new AppError('File not found', 404);
    await prisma.projectFile.delete({ where: { id: fileId } });
  },

  async updateFile(projectId: string, fileId: string, data: { isFinal?: boolean }, _updatedBy: string) {
    const file = await prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
    if (!file) throw new AppError('File not found', 404);

    // Se está marcando como final, desmarca os outros
    if (data.isFinal) {
      await prisma.projectFile.updateMany({
        where: { projectId, isFinal: true },
        data: { isFinal: false },
      });
    }

    return prisma.projectFile.update({
      where: { id: fileId },
      data: { isFinal: data.isFinal },
    });
  },

  async addComment(
    projectId: string,
    data: { content: string; isInternal?: boolean; parentId?: string; userId: string },
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError('Project not found', 404);

    return prisma.comment.create({
      data: { projectId, ...data },
      include: { user: true },
    });
  },

  async deleteComment(projectId: string, commentId: string, _deletedBy: string) {
    const comment = await prisma.comment.findFirst({ where: { id: commentId, projectId } });
    if (!comment) throw new AppError('Comment not found', 404);
    await prisma.comment.delete({ where: { id: commentId } });
  },

  async approve(
    projectId: string,
    data: { approvedBy: string; approvedEmail: string; signature?: string; notes?: string },
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { files: true, order: { include: { items: true } } }
    });
    if (!project) throw new AppError('Project not found', 404);

    // Verifica se há arte final
    const hasFinalArt = project.files.some(f => f.isFinal);
    if (!hasFinalArt) {
      throw new AppError('O projeto precisa ter uma arte final marcada para ser aprovado.', 400);
    }

    const approval = await prisma.approval.create({ data: { projectId, ...data } });

    // Atualiza para PRODUCTION e notifica
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PRODUCTION' },
    });

    return approval;
  },
};