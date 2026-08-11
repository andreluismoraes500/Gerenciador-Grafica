import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';

neonConfig.useSecureWebSocket = true;

const connectionString = process.env.DATABASE_URL!;

// Pooler connection para produção
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});