import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2),
  document: z.string().min(11).max(14),
  email: z.string().email(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  tags: z.array(z.string()).optional(),
  socialMedia: z.record(z.string()).optional(),
  notes: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    district: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('Brasil')
  }).optional()
});

export const updateClientSchema = createClientSchema.partial();
