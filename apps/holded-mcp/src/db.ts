import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

let prisma: PrismaClient | null | undefined;

export function getPrisma() {
  if (!config.DATABASE_URL) {
    return null;
  }

  if (prisma === undefined) {
    prisma = new PrismaClient({
      log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return prisma;
}
