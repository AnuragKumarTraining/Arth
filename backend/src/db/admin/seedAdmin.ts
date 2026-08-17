import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { admins } from '../schema/admin';
import { env } from '../../config/env';
const SALT_ROUNDS = 12;

async function seedAdmin() {
  const email = env.admin?.toLowerCase().trim();
  const rawPassword = env.adminP

  if (!email || !rawPassword) {
    console.error('Error: ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD must be defined in .env');
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin account [${email}] already exists. Skipping.`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

  await db.insert(admins).values({
    email,
    password: hashedPassword,
  });

  console.log(`Admin account [${email}] created successfully.`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin user:', err);
  process.exit(1);
});