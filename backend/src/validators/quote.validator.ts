import { z } from 'zod';

export const createQuoteSchema = z.object({
  clientId: z.string().cuid(),
  items: z.array(z.object({
    productId: z.string().cuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0)
  })).min(1),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  validUntil: z.string().datetime()
});

export const updateQuoteSchema = createQuoteSchema.partial();
