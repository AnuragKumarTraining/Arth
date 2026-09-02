import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';

// Executes pending database migrations.
async function run() {
  console.log('Applying pending database migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
