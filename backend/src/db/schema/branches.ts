import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { accounts } from './accounts';

export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  branchCode: varchar('branch_code', { length: 20 }).notNull().unique(),
  branchName: varchar('branch_name', { length: 100 }).notNull(),
  ifscCode: varchar('ifsc_code', { length: 11 }).notNull().unique(),
  address: text('address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const branchesRelations = relations(branches, ({ many }) => ({
  customers: many(customers),
  accounts: many(accounts),
}));

