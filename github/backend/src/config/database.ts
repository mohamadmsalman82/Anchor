import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton
 * Prevents multiple instances in development with hot-reloading
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Disconnect Prisma client (useful for cleanup in tests)
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

