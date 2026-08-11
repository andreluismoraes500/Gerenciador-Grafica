import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@printflow.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@printflow.com', password: adminPassword, role: 'ADMIN' }
  });

  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Vestuário', slug: 'vestuario' } }),
    prisma.category.create({ data: { name: 'Brindes', slug: 'brindes' } }),
    prisma.category.create({ data: { name: 'Papelaria', slug: 'papelaria' } }),
  ]);

  const products = [
    { name: 'Camiseta Algodão Premium', sku: 'CAM001', costPrice: 15, salePrice: 49.9, category: categories[0].id },
    { name: 'Caneca de Cerâmica 325ml', sku: 'CAN001', costPrice: 8, salePrice: 29.9, category: categories[1].id },
    { name: 'Cartão de Visita 4x4', sku: 'CART001', costPrice: 0.15, salePrice: 0.8, category: categories[2].id },
    { name: 'Banner em Lona 440g', sku: 'BAN001', costPrice: 25, salePrice: 89.9, category: categories[1].id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, stock: 100, margin: ((p.salePrice - p.costPrice) / p.costPrice) * 100, colors: ['Branco', 'Preto'] }
    });
  }

  await prisma.companySettings.upsert({
    where: { id: 'main' }, update: {},
    create: { id: 'main', name: 'PrintFlow Studio', cnpj: '00.000.000/0001-00', email: 'contato@printflow.com', phone: '(11) 99999-9999', address: 'Rua Demo, 123 - SP' }
  });

  console.log('✅ Seed completed');
}

main().finally(() => prisma.$disconnect());
