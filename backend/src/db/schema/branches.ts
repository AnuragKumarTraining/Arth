import { pgTable, serial, varchar, text, date, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { relations } from 'drizzle-orm';
import { customers } from './customers';


export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  branchCode: varchar('branch_code').notNull().unique(),
  branchName: varchar('branch_name', { length: 100 }).notNull(),
  ifscCode: varchar('ifsc_code', { length: 11 }).notNull(),
  address: text('address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const branchesRelations = relations(branches, ({ one,many }) => ({
  customers: many(customers),
  accounts: many(accounts),
}));


