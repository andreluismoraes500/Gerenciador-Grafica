// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do PrintFlow...');

  // ========================================
  // 1. USUÁRIOS
  // ========================================
  console.log('📝 Criando usuários...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const attendantPassword = await bcrypt.hash('123456', 12);
  const designerPassword = await bcrypt.hash('987654', 12);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@printflow.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@printflow.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Atendente
  await prisma.user.upsert({
    where: { email: 'diego@teste.com' },
    update: {},
    create: {
      name: 'Diego Atendente',
      email: 'diego@teste.com',
      password: attendantPassword,
      role: 'ATTENDANT',
      isActive: true,
    },
  });

  // Designer
  await prisma.user.upsert({
    where: { email: 'rogerio@teste.com' },
    update: {},
    create: {
      name: 'Rogério Designer',
      email: 'rogerio@teste.com',
      password: designerPassword,
      role: 'DESIGNER',
      isActive: true,
    },
  });

  console.log('✅ Usuários criados');

  // ========================================
  // 2. CATEGORIAS
  // ========================================
  console.log('📂 Criando categorias...');

  const categories = [
    { name: 'Vestuário', slug: 'vestuario', description: 'Camisetas, moletons, jaquetas e outros' },
    { name: 'Brindes', slug: 'brindes', description: 'Canecas, chaveiros, squeeze e brindes' },
    { name: 'Papelaria', slug: 'papelaria', description: 'Cartões, folders, envelopes e papelaria' },
    { name: 'Adesivos', slug: 'adesivos', description: 'Adesivos, etiquetas e rótulos' },
    { name: 'Banners', slug: 'banners', description: 'Banners, lonas e displays' },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories.push(created);
  }

  console.log('✅ Categorias criadas');

  const catMap = Object.fromEntries(createdCategories.map(c => [c.slug, c]));

  // ========================================
  // 3. PRODUTOS
  // ========================================
  console.log('📦 Criando produtos...');

  const products = [
    // Vestuário
    {
      name: 'Camiseta Algodão Premium',
      sku: 'CAM001',
      costPrice: 15,
      salePrice: 49.9,
      categoryId: catMap.vestuario.id,
      colors: ['Branco', 'Preto', 'Azul'],
      sizes: ['P', 'M', 'G', 'GG'],
      materials: ['Algodão 100%'],
      description: 'Camiseta 100% algodão, 200g/m², estampa silk screen',
    },
    {
      name: 'Camiseta Dry-Fit',
      sku: 'CAM002',
      costPrice: 18,
      salePrice: 59.9,
      categoryId: catMap.vestuario.id,
      colors: ['Branco', 'Preto', 'Vermelho', 'Azul Marinho'],
      sizes: ['P', 'M', 'G', 'GG'],
      materials: ['Poliester 100%'],
      description: 'Camiseta Dry-Fit para atividades esportivas',
    },
    {
      name: 'Moletom Canguru',
      sku: 'MOL001',
      costPrice: 35,
      salePrice: 89.9,
      categoryId: catMap.vestuario.id,
      colors: ['Preto', 'Cinza', 'Azul'],
      sizes: ['P', 'M', 'G', 'GG'],
      materials: ['Algodão 100%', 'Felpa'],
      description: 'Moletom canguru com capuz, algodão felpudo',
    },

    // Brindes
    {
      name: 'Caneca de Cerâmica 325ml',
      sku: 'CAN001',
      costPrice: 8,
      salePrice: 29.9,
      categoryId: catMap.brindes.id,
      colors: ['Branca', 'Preta'],
      description: 'Caneca de cerâmica 325ml, estampa personalizada',
    },
    {
      name: 'Caneca Térmica 450ml',
      sku: 'CAN002',
      costPrice: 12,
      salePrice: 39.9,
      categoryId: catMap.brindes.id,
      colors: ['Preto', 'Prata', 'Azul'],
      description: 'Caneca térmica com tampa, 450ml',
    },
    {
      name: 'Squeeze 500ml',
      sku: 'SQZ001',
      costPrice: 6,
      salePrice: 19.9,
      categoryId: catMap.brindes.id,
      colors: ['Azul', 'Vermelho', 'Verde', 'Preto'],
      description: 'Squeeze 500ml, material plástico atóxico',
    },
    {
      name: 'Chaveiro Acrílico',
      sku: 'CHA001',
      costPrice: 2,
      salePrice: 9.9,
      categoryId: catMap.brindes.id,
      colors: ['Transparente', 'Colorido'],
      description: 'Chaveiro em acrílico com impressão personalizada',
    },

    // Papelaria
    {
      name: 'Cartão de Visita 4x4',
      sku: 'CART001',
      costPrice: 0.15,
      salePrice: 0.8,
      categoryId: catMap.papelaria.id,
      colors: ['Branco', 'Off-white'],
      description: 'Cartão de visita 4x4, papel couchê 300g, impressão offset',
    },
    {
      name: 'Cartão de Visita 4x9',
      sku: 'CART002',
      costPrice: 0.2,
      salePrice: 0.9,
      categoryId: catMap.papelaria.id,
      colors: ['Branco', 'Off-white'],
      description: 'Cartão de visita 4x9, papel couchê 300g',
    },
    {
      name: 'Folder Tríptico A4',
      sku: 'FOL001',
      costPrice: 1.5,
      salePrice: 4.5,
      categoryId: catMap.papelaria.id,
      colors: ['Branco', 'Off-white'],
      description: 'Folder tríptico A4, papel couchê 180g',
    },
    {
      name: 'Envelope Personalizado',
      sku: 'ENV001',
      costPrice: 0.5,
      salePrice: 2.5,
      categoryId: catMap.papelaria.id,
      colors: ['Branco', 'Pardo'],
      description: 'Envelope personalizado com logo',
    },

    // Adesivos
    {
      name: 'Adesivo Vinilico 10x10',
      sku: 'ADS001',
      costPrice: 1.5,
      salePrice: 5.9,
      categoryId: catMap.adesivos.id,
      colors: ['Colorido'],
      materials: ['Vinil'],
      description: 'Adesivo vinilico 10x10cm, corte simples',
    },
    {
      name: 'Adesivo Vinilico 20x20',
      sku: 'ADS002',
      costPrice: 3,
      salePrice: 12.9,
      categoryId: catMap.adesivos.id,
      colors: ['Colorido'],
      materials: ['Vinil'],
      description: 'Adesivo vinilico 20x20cm, corte simples',
    },

    // Banners
    {
      name: 'Banner em Lona 440g',
      sku: 'BAN001',
      costPrice: 25,
      salePrice: 89.9,
      categoryId: catMap.banners.id,
      colors: ['Colorido'],
      materials: ['Lona 440g'],
      description: 'Banner em lona 440g, 1x1m, impressão digital',
    },
    {
      name: 'Banner em Lona 440g 2x1',
      sku: 'BAN002',
      costPrice: 45,
      salePrice: 159.9,
      categoryId: catMap.banners.id,
      colors: ['Colorido'],
      materials: ['Lona 440g'],
      description: 'Banner em lona 440g, 2x1m, impressão digital',
    },
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
        categoryId: p.categoryId,
        stock: 100,
        minStock: 5,
        margin: ((p.salePrice - p.costPrice) / p.costPrice) * 100,
        colors: p.colors || ['Branco', 'Preto'],
        sizes: p.sizes || [],
        materials: p.materials || [],
        description: p.description,
        isActive: true,
      },
    });
  }

  console.log('✅ Produtos criados');

  // ========================================
  // 4. INSUMOS (Stock Items)
  // ========================================
  console.log('📦 Criando insumos...');

  const stockItems = [
    { name: 'Papel Couché 150g A4', category: 'Papel', unit: 'folhas', quantity: 500, minStock: 100, unitCost: 0.50 },
    { name: 'Papel Couché 180g A4', category: 'Papel', unit: 'folhas', quantity: 300, minStock: 80, unitCost: 0.70 },
    { name: 'Papel Couché 300g A4', category: 'Papel', unit: 'folhas', quantity: 200, minStock: 50, unitCost: 1.20 },
    { name: 'Papel Offset 75g A4', category: 'Papel', unit: 'folhas', quantity: 1000, minStock: 200, unitCost: 0.20 },
    { name: 'Tinta CMYK - Cyan', category: 'Tinta', unit: 'litros', quantity: 10, minStock: 2, unitCost: 45.00 },
    { name: 'Tinta CMYK - Magenta', category: 'Tinta', unit: 'litros', quantity: 8, minStock: 2, unitCost: 45.00 },
    { name: 'Tinta CMYK - Yellow', category: 'Tinta', unit: 'litros', quantity: 12, minStock: 2, unitCost: 45.00 },
    { name: 'Tinta CMYK - Black', category: 'Tinta', unit: 'litros', quantity: 15, minStock: 2, unitCost: 45.00 },
    { name: 'Chapa Offset A4', category: 'Chapa', unit: 'unidades', quantity: 50, minStock: 10, unitCost: 8.00 },
    { name: 'Vinil Adesivo Branco', category: 'Vinil', unit: 'metros', quantity: 30, minStock: 5, unitCost: 15.00 },
    { name: 'Lona 440g', category: 'Lona', unit: 'metros', quantity: 50, minStock: 10, unitCost: 22.00 },
  ];

  for (const item of stockItems) {
    const id = `stock-${item.name.replace(/\s/g, '-').toLowerCase()}`;
    await prisma.stockItem.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        minStock: item.minStock,
        unitCost: item.unitCost,
        isActive: true,
      },
    });
  }

  console.log('✅ Insumos criados');

  // ========================================
  // 5. CLIENTES
  // ========================================
  console.log('👤 Criando clientes...');

  const clientPassword = await bcrypt.hash('cliente123', 12);

  const clients = [
    {
      name: 'João Silva',
      document: '12345678901',
      email: 'joao@empresa.com',
      phone: '(11) 99999-1111',
      mobile: '(11) 98888-1111',
      tags: ['VIP', 'Grande'],
      notes: 'Cliente empresarial, sempre pede grandes quantidades',
    },
    {
      name: 'Maria Santos',
      document: '98765432100',
      email: 'maria@loja.com',
      phone: '(11) 99999-2222',
      mobile: '(11) 98888-2222',
      tags: ['Design'],
      notes: 'Designer, pedidos recorrentes de papelaria',
    },
    {
      name: 'Pedro Oliveira',
      document: '11122233344',
      email: 'pedro@eventos.com',
      phone: '(11) 99999-3333',
      mobile: '(11) 98888-3333',
      tags: ['Eventos'],
      notes: 'Organizador de eventos, pedidos sazonais',
    },
    {
      name: 'Ana Costa',
      document: '44455566677',
      email: 'ana@mercado.com',
      phone: '(11) 99999-4444',
      mobile: '(11) 98888-4444',
      tags: ['Lojista'],
      notes: 'Lojista de materiais de escritório',
    },
  ];

  for (const clientData of clients) {
    const randomPassword = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    await prisma.client.upsert({
      where: { document: clientData.document },
      update: {},
      create: {
        name: clientData.name,
        document: clientData.document,
        email: clientData.email,
        phone: clientData.phone,
        mobile: clientData.mobile,
        tags: clientData.tags,
        notes: clientData.notes,
        userId: await prisma.user
          .upsert({
            where: { email: clientData.email },
            update: {},
            create: {
              name: clientData.name,
              email: clientData.email,
              password: passwordHash,
              role: 'CLIENT',
              isActive: true,
            },
          })
          .then((u) => u.id),
        address: {
          create: {
            street: 'Rua Exemplo',
            number: '123',
            complement: 'Sala 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        },
      },
    });
  }

  console.log('✅ Clientes criados');

  // ========================================
  // 6. FORNECEDORES
  // ========================================
  console.log('🏢 Criando fornecedores...');

  const suppliers = [
    {
      name: 'Papelaria Universo',
      document: '11222333000188',
      email: 'contato@universo.com',
      phone: '(11) 3333-1111',
      contact: 'Carlos',
      address: 'Rua das Papelarias, 100',
      notes: 'Fornecedor principal de papéis',
    },
    {
      name: 'Tintas Coloridas',
      document: '22333444000199',
      email: 'contato@tintas.com',
      phone: '(11) 3333-2222',
      contact: 'Roberta',
      address: 'Av. das Tintas, 200',
      notes: 'Fornecedor de tintas e insumos',
    },
    {
      name: 'Lonas e Telas Brasil',
      document: '33444555000100',
      email: 'contato@lonas.com',
      phone: '(11) 3333-3333',
      contact: 'Marcelo',
      address: 'Rua das Lonas, 300',
      notes: 'Fornecedor de lonas e banners',
    },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { document: sup.document },
      update: {},
      create: sup,
    });
  }

  console.log('✅ Fornecedores criados');

  // ========================================
  // 7. CONFIGURAÇÕES DA EMPRESA
  // ========================================
  console.log('⚙️ Criando configurações...');

  await prisma.companySettings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      name: 'PrintFlow Studio',
      cnpj: '00.000.000/0001-00',
      email: 'contato@printflow.com',
      phone: '(11) 99999-9999',
      address: 'Rua Demo, 123 - São Paulo - SP',
      invoicePrefix: 'NF',
      quotePrefix: 'ORC',
      orderPrefix: 'PED',
    },
  });

  console.log('✅ Configurações criadas');

  // ========================================
  // 8. ORÇAMENTO EXEMPLO
  // ========================================
  console.log('📄 Criando orçamento exemplo...');

  const client = await prisma.client.findFirst({
    where: { email: 'joao@empresa.com' },
  });

  if (client) {
    const product = await prisma.product.findFirst({
      where: { sku: 'CAM001' },
    });

    if (product) {
      await prisma.quote.upsert({
        where: { number: 'ORC-000001' },
        update: {},
        create: {
          number: 'ORC-000001',
          clientId: client.id,
          subtotal: 49.9,
          total: 49.9,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          notes: 'Orçamento de camiseta para eventos',
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 49.9,
                totalPrice: 49.9,
              },
            ],
          },
        },
      });
    }
  }

  console.log('✅ Orçamento exemplo criado');

  // ========================================
  // 9. PEDIDO EXEMPLO
  // ========================================
  console.log('📦 Criando pedido exemplo...');

  if (client) {
    const product = await prisma.product.findFirst({
      where: { sku: 'CAM001' },
    });

    if (product) {
      await prisma.order.upsert({
        where: { code: 'PED-000001' },
        update: {},
        create: {
          code: 'PED-000001',
          clientId: client.id,
          subtotal: 99.8,
          discount: 0,
          shippingCost: 10,
          total: 109.8,
          paymentMethod: 'PIX',
          paymentStatus: 'PENDING',
          status: 'BUDGET',
          notes: 'Pedido de camisetas para evento',
          items: {
            create: [
              {
                productId: product.id,
                quantity: 2,
                unitPrice: 49.9,
                totalPrice: 99.8,
              },
            ],
          },
        },
      });
    }
  }

  console.log('✅ Pedido exemplo criado');

  // ========================================
  // 10. RESUMO FINAL
  // ========================================
  console.log('\n🎉 SEED CONCLUÍDO COM SUCESSO!');
  console.log('\n📋 CREDENCIAIS:');
  console.log('  🔑 ADMIN: admin@printflow.com / admin123');
  console.log('  🔑 ATTENDANT: diego@teste.com / 123456');
  console.log('  🔑 DESIGNER: rogerio@teste.com / 987654');
  console.log('  🔑 CLIENTE: joao@empresa.com / cliente123');
  console.log('\n📊 DADOS CRIADOS:');
  console.log(`  ✅ ${(await prisma.user.count())} usuários`);
  console.log(`  ✅ ${(await prisma.category.count())} categorias`);
  console.log(`  ✅ ${(await prisma.product.count())} produtos`);
  console.log(`  ✅ ${(await prisma.stockItem.count())} insumos`);
  console.log(`  ✅ ${(await prisma.client.count())} clientes`);
  console.log(`  ✅ ${(await prisma.supplier.count())} fornecedores`);
  console.log(`  ✅ ${(await prisma.quote.count())} orçamentos`);
  console.log(`  ✅ ${(await prisma.order.count())} pedidos`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });