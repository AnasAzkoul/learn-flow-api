import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schemas/index.ts";
import { requireEnv } from "../utils/env.js";

export const db = drizzle({
  connection: {
    connectionString: requireEnv("DATABASE_URL"),
  },
});
