import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  clientId: z.string().cuid(),
  designerId: z.string().cuid().optional(),
  orderId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL')
});

export const updateProjectSchema = createProjectSchema.partial();
