// Re-export prisma from shared db package (named + default for compatibility)
import { prisma } from '@verifactu/db';

export { prisma };
export default prisma;
