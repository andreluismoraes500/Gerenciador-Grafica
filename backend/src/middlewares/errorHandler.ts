import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: any, req: Request, res: Response, _: NextFunction) => {
  console.error('[ERROR]', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Unique constraint violation', field: err.meta?.target });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  }

  return res.status(500).json({ error: 'Internal server error' });
};
