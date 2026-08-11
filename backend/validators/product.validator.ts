import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().cuid().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  isCustomizable: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export const updateProductSchema = createProductSchema.partial();