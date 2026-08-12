import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  
  // 1. Criar Admin
  await prisma.user.upsert({
    where: { email: 'admin@printflow.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@printflow.com', password: adminPassword, role: 'ADMIN' }
  });

  // 2. Criar Categorias
  const cat1 = await prisma.category.upsert({
    where: { slug: 'vestuario' }, update: {}, create: { name: 'Vestuário', slug: 'vestuario' }
  });
  const cat2 = await prisma.category.upsert({
    where: { slug: 'brindes' }, update: {}, create: { name: 'Brindes', slug: 'brindes' }
  });
  const cat3 = await prisma.category.upsert({
    where: { slug: 'papelaria' }, update: {}, create: { name: 'Papelaria', slug: 'papelaria' }
  });

  // 3. Criar Produtos (CORRIGIDO: usando categoryId)
  const products = [
    { name: 'Camiseta Algodão Premium', sku: 'CAM001', costPrice: 15, salePrice: 49.9, categoryId: cat1.id },
    { name: 'Caneca de Cerâmica 325ml', sku: 'CAN001', costPrice: 8, salePrice: 29.9, categoryId: cat2.id },
    { name: 'Cartão de Visita 4x4', sku: 'CART001', costPrice: 0.15, salePrice: 0.8, categoryId: cat3.id },
    { name: 'Banner em Lona 440g', sku: 'BAN001', costPrice: 25, salePrice: 89.9, categoryId: cat2.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { 
        name: p.name,
        sku: p.sku,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        categoryId: p.categoryId, // <-- Aqui está a correção
        stock: 100, 
        margin: ((p.salePrice - p.costPrice) / p.costPrice) * 100, 
        colors: ['Branco', 'Preto'] 
      }
    });
  }

  // 4. Criar Configurações da Empresa
  await prisma.companySettings.upsert({
    where: { id: 'main' }, 
    update: {},
    create: { id: 'main', name: 'PrintFlow Studio', cnpj: '00.000.000/0001-00', email: 'contato@printflow.com', phone: '(11) 99999-9999', address: 'Rua Demo, 123 - SP' }
  });

  console.log('✅ Seed completed');
}

main().finally(() => prisma.$disconnect());