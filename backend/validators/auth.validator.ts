import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'DESIGNER', 'ATTENDANT', 'CLIENT']).optional()
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6)
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().optional()
});