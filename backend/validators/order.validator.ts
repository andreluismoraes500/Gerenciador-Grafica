import { z } from 'zod';

export const createOrderSchema = z.object({
  clientId: z.string().cuid(),
  items: z.array(z.object({
    productId: z.string().cuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    customizations: z.record(z.any()).optional()
  })).min(1),
  shippingCost: z.number().min(0).default(0),
  shippingAddress: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BOLETO', 'CREDIT_CARD', 'PIX']),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional()
});