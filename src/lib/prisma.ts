import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  // Auto-reload client if newly generated models (e.g. telegramConfig, notification) are missing in cached instance
  if (!globalForPrisma.prisma || !("telegramConfig" in globalForPrisma.prisma)) {
    if (globalForPrisma.prisma) {
      try {
        (globalForPrisma.prisma as any).$disconnect();
      } catch {
        // ignore
      }
    }
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

// Proxy wrapper ensures any dynamic schema/client updates immediately reflect without dev server restart
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

export default prisma;
