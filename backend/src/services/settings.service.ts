import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

async function getOrCreateSettings() {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {
        name: 'PrintFlow Studio',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
      },
    });
  }
  return settings;
}

export const settingsService = {
  async getCompanySettings() {
    return getOrCreateSettings();
  },

  async updateCompanySettings(data: any) {
    const settings = await getOrCreateSettings();
    return prisma.companySettings.update({ where: { id: settings.id }, data });
  },

  async uploadLogo(file: Express.Multer.File) {
    const settings = await getOrCreateSettings();
    return prisma.companySettings.update({
      where: { id: settings.id },
      data: { logoUrl: `/uploads/${file.filename}` },
    });
  },

  async getSmtpSettings() {
    const settings = await getOrCreateSettings();
    return {
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpFrom: settings.smtpFrom,
      // nunca retorna a senha
    };
  },

  async updateSmtpSettings(data: any) {
    const settings = await getOrCreateSettings();
    return prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUser: data.smtpUser,
        smtpPassword: data.smtpPassword,
        smtpFrom: data.smtpFrom,
      },
    });
  },

  async testEmail(to: string) {
    const settings = await getOrCreateSettings();
    const host = settings.smtpHost || process.env.SMTP_HOST;
    const port = settings.smtpPort || Number(process.env.SMTP_PORT) || 587;
    const user = settings.smtpUser || process.env.SMTP_USER;
    const pass = settings.smtpPassword || process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) throw new AppError('SMTP not configured', 400);

    const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });

    await transporter.sendMail({
      from: settings.smtpFrom || process.env.SMTP_FROM,
      to,
      subject: 'PrintFlow — Teste de e-mail',
      text: 'Este é um e-mail de teste enviado pelo PrintFlow Studio.',
    });
  },

  async listUsers() {
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createUser(data: { name: string; email: string; password: string; role?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    return prisma.user.create({
      data: { name: data.name, email: data.email, password: passwordHash, role: (data.role as any) || 'ATTENDANT' },
      select: { id: true, name: true, email: true, role: true },
    });
  },

  async updateUser(id: string, data: any) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('User not found', 404);

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  },

  async deleteUser(id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('User not found', 404);
    await prisma.user.update({ where: { id }, data: { isActive: false } });
  },

  async createBackup() {
    const [users, clients, products, orders, projects, quotes] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
      prisma.client.findMany(),
      prisma.product.findMany(),
      prisma.order.findMany({ include: { items: true } }),
      prisma.project.findMany(),
      prisma.quote.findMany({ include: { items: true } }),
    ]);

    return {
      generatedAt: new Date(),
      data: { users, clients, products, orders, projects, quotes },
    };
  },
};
