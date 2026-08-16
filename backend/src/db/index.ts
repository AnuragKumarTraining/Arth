import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '../config/env';

if (!env.dbUrl) {
    throw new Error("DATABASE_URL environment variable is missing");
}
// Connection pool configuration
const pool = new Pool({
    connectionString: env.dbUrl,
});

export const db = drizzle(pool, { schema });