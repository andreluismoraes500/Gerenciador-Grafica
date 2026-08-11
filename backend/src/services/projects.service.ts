import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

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

    // Designers só veem os próprios projetos por padrão; clientes só veem os seus
    if (role === 'DESIGNER' && !designerId) where.designerId = userId;
    if (role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId } });
      where.clientId = client?.id ?? '__none__';
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { client: true, designer: true, files: true },
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

  async updateStatus(id: string, status: string, _updatedBy: string) {
    if (!VALID_STATUSES.includes(status)) throw new AppError('Invalid status', 400);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new AppError('Project not found', 404);

    return prisma.project.update({
      where: { id },
      data: {
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt,
      },
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
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError('Project not found', 404);

    const approval = await prisma.approval.create({ data: { projectId, ...data } });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PRODUCTION' },
    });

    return approval;
  },
};
