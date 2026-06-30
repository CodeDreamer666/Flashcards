import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// 1. Initialize the pool and adapter
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. Create the client factory function
const createPrismaClient = () =>
    new PrismaClient({
        // In Prisma 7, you pass the adapter here
        adapter,
        log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

// 3. Singleton pattern for Next.js / Fast Refresh
const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;