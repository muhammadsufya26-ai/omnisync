import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Ensures PostgreSQL connection strings in serverless environments (Vercel + Neon / Supabase)
 * include recommended PgBouncer / connection-limit parameters to prevent connection exhaustion.
 */
function resolvePooledDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  // Only normalize PostgreSQL URLs in production serverless environments
  if (
    process.env.NODE_ENV === "production" &&
    (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://"))
  ) {
    try {
      const parsed = new URL(rawUrl);
      // If using a pooled host (e.g. Neon -pooler or Supabase pooler :6543), ensure pgbouncer=true
      if (
        (parsed.hostname.includes("-pooler") || parsed.port === "6543") &&
        !parsed.searchParams.has("pgbouncer")
      ) {
        parsed.searchParams.set("pgbouncer", "true");
      }
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "5");
      }
      if (!parsed.searchParams.has("pool_timeout")) {
        parsed.searchParams.set("pool_timeout", "15");
      }
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  return rawUrl;
}

function createPrismaClient(): PrismaClient {
  const datasourceUrl = resolvePooledDatabaseUrl();

  return new PrismaClient({
    ...(datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Reuse the PrismaClient singleton across hot-reloads in dev and warm serverless invocations in production
export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();
export const prisma: PrismaClient = db;

globalForPrisma.prisma = db;

export default db;
