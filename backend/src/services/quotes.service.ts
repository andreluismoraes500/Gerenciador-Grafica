import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { generateQuotePDF } from './pdf.service';
import nodemailer from 'nodemailer';

async function generateQuoteNumber() {
  const count = await prisma.quote.count();
  return `ORC-${String(count + 1).padStart(6, '0')}`;
}

export const quotesService = {
  async list({ page, limit, status, clientId }: { page: number; limit: number; status?: string; clientId?: string }) {
    const where: any = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const [data, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: { client: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { client: true, items: { include: { product: true } } },
    });
    if (!quote) throw new AppError('Quote not found', 404);
    return quote;
  },

  async create(data: any) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new AppError('Client not found', 404);

    const itemsWithTotal = data.items.map((i: any) => ({ ...i, totalPrice: i.quantity * i.unitPrice }));
    const subtotal = itemsWithTotal.reduce((sum: number, i: any) => sum + i.totalPrice, 0);
    const total = subtotal - (data.discount || 0);
    const number = await generateQuoteNumber();

    return prisma.quote.create({
      data: {
        number,
        clientId: data.clientId,
        subtotal,
        discount: data.discount || 0,
        total,
        notes: data.notes,
        validUntil: new Date(data.validUntil),
        items: { create: itemsWithTotal },
      },
      include: { client: true, items: { include: { product: true } } },
    });
  },

  async update(id: string, data: any) {
    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new AppError('Quote not found', 404);
    if (existing.status !== 'DRAFT') throw new AppError('Only draft quotes can be edited', 400);

    return prisma.quote.update({
      where: { id },
      data: {
        notes: data.notes,
        discount: data.discount,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new AppError('Quote not found', 404);
    await prisma.quote.delete({ where: { id } });
  },

  async updateStatus(id: string, status: string) {
    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new AppError('Quote not found', 404);
    return prisma.quote.update({ where: { id }, data: { status: status as any } });
  },

  async generatePDF(id: string) {
    return generateQuotePDF(id);
  },

  async sendByEmail(id: string, to?: string) {
    const quote = await prisma.quote.findUnique({ where: { id }, include: { client: true } });
    if (!quote) throw new AppError('Quote not found', 404);

    const settings = await prisma.companySettings.findFirst();
    const host = settings?.smtpHost || process.env.SMTP_HOST;
    const port = settings?.smtpPort || Number(process.env.SMTP_PORT) || 587;
    const user = settings?.smtpUser || process.env.SMTP_USER;
    const pass = settings?.smtpPassword || process.env.SMTP_PASSWORD;
    if (!host || !user || !pass) throw new AppError('SMTP not configured', 400);

    const pdfBuffer = await generateQuotePDF(id);
    const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });

    await transporter.sendMail({
      from: settings?.smtpFrom || process.env.SMTP_FROM,
      to: to || quote.client.email,
      subject: `Orçamento #${quote.number}`,
      text: 'Segue em anexo o orçamento solicitado.',
      attachments: [{ filename: `orcamento-${quote.number}.pdf`, content: pdfBuffer }],
    });

    await prisma.quote.update({ where: { id }, data: { status: 'SENT' } });
  },

  async convertToOrder(id: string, creatorId: string, paymentMethod: string) {
    const quote = await prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) throw new AppError('Quote not found', 404);
    if (quote.status === 'CONVERTED') throw new AppError('Quote already converted', 400);

    const count = await prisma.order.count();
    const code = `PED-${String(count + 1).padStart(6, '0')}`;

    const order = await prisma.order.create({
      data: {
        code,
        clientId: quote.clientId,
        creatorId,
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        paymentMethod: paymentMethod as any,
        items: {
          create: quote.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.quote.update({ where: { id }, data: { status: 'CONVERTED', orderId: order.id } });

    return order;
  },
};
