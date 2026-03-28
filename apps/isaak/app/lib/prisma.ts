import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const databaseUrl = process.env.DATABASE_URL ?? '';
const useAccelerate =
  databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://');

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return (useAccelerate ? client.$extends(withAccelerate()) : client) as unknown as PrismaClient;
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
