import { z } from 'zod';
export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  orderId: z.string().cuid().optional().nullable(),
  supplierId: z.string().cuid().optional().nullable(),
  clientId: z.string().cuid().optional().nullable(),
});
export const updateTransactionSchema = createTransactionSchema.partial();