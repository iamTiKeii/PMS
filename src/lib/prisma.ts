import { PrismaClient } from "@prisma/client";

declare const __non_webpack_require__: any;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function instantiatePrisma(): PrismaClient {
  let ClientClass = PrismaClient;
  try {
    const nativeRequire = typeof __non_webpack_require__ !== "undefined" 
      ? __non_webpack_require__ 
      : eval("require");
    if (nativeRequire && nativeRequire.cache) {
      Object.keys(nativeRequire.cache).forEach((key) => {
        if (key.includes(".prisma") || key.includes("@prisma")) {
          delete nativeRequire.cache[key];
        }
      });
      const freshModule = nativeRequire("@prisma/client");
      if (freshModule && freshModule.PrismaClient) {
        ClientClass = freshModule.PrismaClient;
      }
    }
  } catch {
    // fallback to static import
  }
  return new ClientClass({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getPrismaClient(): PrismaClient {
  // Auto-reload client if newly generated models are missing in cached instance
  if (
    !globalForPrisma.prisma ||
    !("telegramConfig" in globalForPrisma.prisma) ||
    !("role" in globalForPrisma.prisma) ||
    !("userRole" in globalForPrisma.prisma) ||
    !("supportBusiness" in globalForPrisma.prisma)
  ) {
    if (globalForPrisma.prisma) {
      try {
        (globalForPrisma.prisma as any).$disconnect();
      } catch {
        // ignore
      }
    }
    globalForPrisma.prisma = instantiatePrisma();
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
