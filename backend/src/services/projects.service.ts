// backend/src/services/projects.service.ts
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { notificationsService } from './notifications.service';
import fs from 'fs';
import path from 'path';

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

  /**
   * 🔥 EDITAR PROJETO - Atualiza dados do projeto
   */
  async update(id: string, data: any, updatedBy: string) {
    const existing = await prisma.project.findUnique({ 
      where: { id },
      include: { client: true, designer: true }
    });
    if (!existing) throw new AppError('Projeto não encontrado', 404);

    // Verifica se o projeto pode ser editado
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new AppError('Projetos concluídos ou cancelados não podem ser editados', 400);
    }

    // Atualiza o projeto
    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        clientId: data.clientId !== undefined ? data.clientId : existing.clientId,
        designerId: data.designerId !== undefined ? data.designerId : existing.designerId,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : existing.dueDate,
      },
      include: { client: true, designer: true },
    });

    // Notifica o designer se foi alterado
    if (data.designerId && data.designerId !== existing.designerId && data.designerId !== updatedBy) {
      await notificationsService.create(data.designerId, {
        title: '📋 Projeto reatribuído',
        message: `O projeto "${updated.title}" foi atribuído a você.`,
        type: 'INFO',
        metadata: { entity: 'Project', entityId: updated.id, route: '/projects' },
      });
    }

    return updated;
  },

  /**
   * 🔥 EXCLUIR PROJETO - Remove o projeto e seus arquivos físicos
   */
  async delete(id: string, deletedBy: string) {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { 
        files: true,
        tasks: true,
        comments: true,
        approvals: true
      }
    });
    if (!existing) throw new AppError('Projeto não encontrado', 404);

    // Verifica se o projeto pode ser excluído
    if (existing.status === 'COMPLETED') {
      throw new AppError('Projetos concluídos não podem ser excluídos. Considere arquivar.', 400);
    }

    // 🔥 Remove todos os arquivos físicos do projeto
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    for (const file of existing.files) {
      try {
        const filename = file.url.split('/').pop();
        if (filename) {
          const filePath = path.join(uploadDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[deleteProject] Arquivo físico removido: ${filePath}`);
          }
        }
      } catch (error) {
        console.error('[deleteProject] Erro ao remover arquivo:', error);
      }
    }

    // 🔥 Remove o projeto e todos os registros relacionados em cascata
    await prisma.$transaction(async (tx) => {
      // Remove aprovações
      await tx.approval.deleteMany({ where: { projectId: id } });
      
      // Remove comentários
      await tx.comment.deleteMany({ where: { projectId: id } });
      
      // Remove arquivos (registros)
      await tx.projectFile.deleteMany({ where: { projectId: id } });
      
      // Remove tarefas vinculadas
      await tx.task.updateMany({
        where: { projectId: id },
        data: { projectId: null }
      });
      
      // Remove o projeto
      await tx.project.delete({ where: { id } });
    });

    // Notifica a equipe sobre a exclusão
    await notificationsService.notifyTeam(deletedBy, {
      title: '🗑️ Projeto excluído',
      message: `O projeto "${existing.title}" foi excluído do sistema.`,
      type: 'WARNING',
      metadata: { entity: 'Project', entityId: id },
    });
  },

  async updateStatus(id: string, status: string, updatedBy: string) {
    if (!VALID_STATUSES.includes(status)) throw new AppError('Invalid status', 400);

    const existing = await prisma.project.findUnique({ 
      where: { id },
      include: { files: true, order: { include: { items: { include: { product: true } } } } }
    });
    if (!existing) throw new AppError('Project not found', 404);

    if (status === 'PRODUCTION' || status === 'COMPLETED') {
      const hasFinalArt = existing.files.some(f => f.isFinal);
      if (!hasFinalArt) {
        throw new AppError(
          'O projeto precisa ter uma arte final marcada antes de ser enviado para produção.',
          400
        );
      }
    }

    if (status === 'COMPLETED') {
      return this.completeProject(id, updatedBy);
    }

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

    const hasFinalArt = project.files.some(f => f.isFinal);
    if (!hasFinalArt) {
      throw new AppError(
        'O projeto precisa ter uma arte final marcada antes de ser concluído.',
        400
      );
    }

    return await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      if (project.orderId) {
        await tx.order.update({
          where: { id: project.orderId },
          data: {
            status: 'READY',
            productionStep: 'SHIPPING',
          },
        });

        // Dedução de estoque de insumos (stockItems)
        const orderItems = project.order?.items || [];
        for (const item of orderItems) {
          const stockItems = await tx.stockItem.findMany({
            where: {
              category: item.product.categoryId ? { equals: item.product.categoryId } : undefined,
              isActive: true,
            },
          });

          if (stockItems.length > 0) {
            const amountToDeduct = item.quantity * 1;
            const stockItem = stockItems[0];
            
            if (stockItem.quantity >= amountToDeduct) {
              await tx.stockItem.update({
                where: { id: stockItem.id },
                data: {
                  quantity: { decrement: amountToDeduct },
                },
              });

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

      if (project.designerId) {
        await notificationsService.create(project.designerId, {
          title: '✅ Projeto concluído',
          message: `O projeto "${project.title}" foi concluído e está pronto para entrega.`,
          type: 'SUCCESS',
          metadata: { entity: 'Project', entityId: projectId, route: '/projects' },
        });
      }

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
    const file = await prisma.projectFile.findFirst({ 
      where: { id: fileId, projectId } 
    });
    if (!file) throw new AppError('Arquivo não encontrado', 404);
    
    // Excluir arquivo físico do disco
    try {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filename = file.url.split('/').pop();
      if (filename) {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[deleteFile] Arquivo físico removido: ${filePath}`);
        } else {
          console.log(`[deleteFile] Arquivo físico não encontrado: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('[deleteFile] Erro ao remover arquivo físico:', error);
    }
    
    await prisma.projectFile.delete({ where: { id: fileId } });
  },

  async updateFile(projectId: string, fileId: string, data: { isFinal?: boolean }, _updatedBy: string) {
    const file = await prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
    if (!file) throw new AppError('File not found', 404);

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

    const hasFinalArt = project.files.some(f => f.isFinal);
    if (!hasFinalArt) {
      throw new AppError('O projeto precisa ter uma arte final marcada para ser aprovado.', 400);
    }

    const approval = await prisma.approval.create({ data: { projectId, ...data } });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PRODUCTION' },
    });

    return approval;
  },
};