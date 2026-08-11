import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { randomBytes } from 'crypto';

const signToken = (userId: string, expiresIn = process.env.JWT_EXPIRES_IN!) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: expiresIn as any });

const signRefresh = (userId: string) =>
  jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any
  });

export const authService = {
  async login(email: string, password: string, device?: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new AppError('Invalid credentials', 401);

    const token = signToken(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.session.create({
      data: { userId: user.id, token: refreshToken, device, ip, expiresAt: new Date(Date.now() + 7 * 86400000) }
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } };
  },

  async register(data: { name: string; email: string; password: string; role?: string }) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: passwordHash, role: (data.role as any) || 'ATTENDANT' }
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  async refresh(token: string) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
      const session = await prisma.session.findFirst({ where: { token, userId: payload.sub, expiresAt: { gt: new Date() } } });
      if (!session) throw new AppError('Invalid session', 401);

      const newToken = signToken(payload.sub);
      return { token: newToken };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  }
};