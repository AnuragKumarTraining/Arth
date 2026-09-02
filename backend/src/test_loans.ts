import { db } from './db';
import { loans } from './db/schema';

// Verifies loans table existence in PostgreSQL database.
async function verifyLoansTable() {
  const result = await db.select().from(loans).limit(1);
  console.log('Successfully queried loans table. Count:', result.length);
  process.exit(0);
}

verifyLoansTable().catch((err) => {
  console.error('Failed to query loans table:', err);
  process.exit(1);
});
