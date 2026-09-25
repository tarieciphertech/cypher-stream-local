import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type Database = ReturnType<typeof drizzle>;

let pool: InstanceType<typeof Pool> | null = null;
let database: Database | null = null;

export function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to use database-backed routes");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  if (!database) {
    database = drizzle(pool, { schema });
  }

  return database;
}

export * from "./schema";
