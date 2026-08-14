import { z } from 'zod';

// Schema para item do pedido
const orderItemSchema = z.object({
  productId: z.string().cuid('ID do produto inválido'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.number().min(0, 'Preço unitário não pode ser negativo'),
  discount: z.number().min(0).max(1, 'Desconto deve ser entre 0 e 1').default(0),
  customizations: z.record(z.any()).optional()
});

// Schema para criação de pedido
export const createOrderSchema = z.object({
  clientId: z.string().cuid('ID do cliente inválido'),
  items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um item'),
  shippingCost: z.number().min(0, 'Frete não pode ser negativo').default(0),
  shippingAddress: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BOLETO', 'CREDIT_CARD', 'PIX'], {
    errorMap: () => ({ message: 'Método de pagamento inválido' })
  }),
  discount: z.number().min(0).max(1, 'Desconto deve ser entre 0 e 1').default(0),
  notes: z.string().optional(),
  dueDate: z.string().datetime({ message: 'Data inválida' }).optional()
});

// Schema para atualização de pedido
export const updateOrderSchema = createOrderSchema.partial();

// Schema para atualização de status
export const updateOrderStatusSchema = z.object({
  status: z.enum(['BUDGET', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED'])
});

// Schema para atualização de pagamento
export const updateOrderPaymentSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED', 'CANCELLED'])
});

// Schema para filtros de listagem
export const orderFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});