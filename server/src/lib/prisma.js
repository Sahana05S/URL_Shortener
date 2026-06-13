import { PrismaClient } from "@prisma/client";

const globalStore = globalThis;

export const prisma =
  globalStore.__linkoraPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalStore.__linkoraPrisma = prisma;
}
