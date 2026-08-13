import { z } from 'zod';
export const createStockItemSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  unit: z.string().min(1),
  quantity: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  unitCost: z.number().min(0).default(0),
});
export const updateStockItemSchema = createStockItemSchema.partial();