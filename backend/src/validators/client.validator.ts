// backend/src/validators/client.validator.ts
import { z } from 'zod';

function validateCpf(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

function validateCnpj(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

function validateDocument(doc: string): boolean {
  const clean = doc.replace(/[^\d]/g, '');
  if (clean.length === 11) return validateCpf(clean);
  if (clean.length === 14) return validateCnpj(clean);
  return false;
}

// ✅ CORREÇÃO: Tratar email como opcional e permitir vazio
export const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  document: z.string()
    .min(11, 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos')
    .max(18, 'Documento muito longo')
    .refine(val => {
      const clean = val.replace(/[^\d]/g, '');
      return clean.length === 11 || clean.length === 14;
    }, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos')
    .refine(validateDocument, 'CPF/CNPJ inválido'),
  email: z.union([
    z.string().email('Email inválido'),
    z.string().max(0), // Aceita string vazia
    z.null(),
    z.undefined()
  ]).optional().transform(val => val || ''),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  tags: z.array(z.string()).optional(),
  socialMedia: z.record(z.string()).optional(),
  notes: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('Brasil')
  }).optional()
});

export const updateClientSchema = createClientSchema.partial();