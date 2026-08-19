import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export const authMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token não fornecido', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new AppError('Usuário não encontrado ou inativo', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Token inválido', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expirado', 401));
    } else {
      next(error);
    }
  }
};

// Permissões baseadas em roles
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Não autenticado', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Acesso negado. Permissão insuficiente.', 403));
    }
    next();
  };
};

// Permissões específicas para cada funcionalidade

// CLIENTES: ADMIN e ATTENDANT podem criar/editar/excluir, DESIGNER só visualiza
export const canManageClients = requireRole('ADMIN', 'ATTENDANT');
export const canViewClients = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// PRODUTOS: ADMIN e ATTENDANT podem criar/editar/excluir, DESIGNER só visualiza
export const canManageProducts = requireRole('ADMIN', 'ATTENDANT');
export const canViewProducts = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// ORÇAMENTOS: ADMIN e ATTENDANT podem criar/editar/excluir, DESIGNER só visualiza
export const canManageQuotes = requireRole('ADMIN', 'ATTENDANT');
export const canViewQuotes = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// PEDIDOS: ADMIN e ATTENDANT podem criar/editar/excluir, DESIGNER só visualiza
export const canManageOrders = requireRole('ADMIN', 'ATTENDANT');
export const canViewOrders = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// PROJETOS: ADMIN, DESIGNER e ATTENDANT podem gerenciar, CLIENT só visualiza próprios
export const canManageProjects = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');
export const canViewProjects = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER', 'CLIENT');

// INSUMOS: ADMIN e ATTENDANT podem gerenciar, DESIGNER só visualiza
export const canManageStock = requireRole('ADMIN', 'ATTENDANT');
export const canViewStock = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// FORNECEDORES: ADMIN e ATTENDANT podem gerenciar, DESIGNER só visualiza
export const canManageSuppliers = requireRole('ADMIN', 'ATTENDANT');
export const canViewSuppliers = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// FINANCEIRO: ADMIN pode tudo, ATTENDANT visualiza, DESIGNER não acessa
export const canManageFinance = requireRole('ADMIN');
export const canViewFinance = requireRole('ADMIN', 'ATTENDANT');

// TAREFAS: ADMIN, ATTENDANT e DESIGNER podem gerenciar
export const canManageTasks = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');

// CONFIGURAÇÕES: apenas ADMIN
export const canManageSettings = requireRole('ADMIN');
export const canViewSettings = requireRole('ADMIN', 'DESIGNER');

// Adicione as permissões para kits
export const canManageKits = requireRole('ADMIN', 'ATTENDANT');
export const canViewKits = requireRole('ADMIN', 'ATTENDANT', 'DESIGNER');