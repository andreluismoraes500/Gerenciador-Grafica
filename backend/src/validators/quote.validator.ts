// backend/src/validators/quote.validator.ts
import { z } from 'zod';

// Schema para item do orçamento
const quoteItemSchema = z.object({
  productId: z.string().cuid('ID do produto inválido'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.number().min(0, 'Preço unitário não pode ser negativo'),
});

// Schema para criação de orçamento
export const createQuoteSchema = z.object({
  clientId: z.string().cuid('ID do cliente inválido'),
  items: z.array(quoteItemSchema).min(1, 'Adicione pelo menos um item'),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  validUntil: z.string().datetime('Data inválida')
});

// ✅ Schema para atualização de orçamento (todos os campos opcionais)
export const updateQuoteSchema = z.object({
  clientId: z.string().cuid('ID do cliente inválido').optional(),
  items: z.array(quoteItemSchema).min(1, 'Adicione pelo menos um item').optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  validUntil: z.string().datetime('Data inválida').optional()
});