import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

/**
 * Database client (Neon Postgres via Drizzle HTTP driver).
 * Use this with Neon pooled connection strings (*-pooler*).
 */

export type Db = ReturnType<typeof createDb>;

function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

let cached: Db | null = null;

export function getDb(): Db {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }

  if (!cached) {
    cached = createDb(databaseUrl);
  }

  return cached;
}
