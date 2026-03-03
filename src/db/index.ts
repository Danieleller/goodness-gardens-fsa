import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

// Use globalThis to avoid re-creating during hot reloads in dev
const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof createDb> | undefined;
};

// Lazy initialization — only create the DB connection when first accessed
// This prevents build-time errors when env vars aren't available
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, receiver) {
    const instance = globalForDb._db ?? (globalForDb._db = createDb());
    return Reflect.get(instance, prop, receiver);
  },
});
