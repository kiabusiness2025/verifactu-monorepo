import { prisma } from '@verifactu/db';

export { prisma };

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  return prisma.$queryRawUnsafe(sql, ...(params || []));
}

export async function one<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await prisma.$queryRawUnsafe(sql, ...(params || []));
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
