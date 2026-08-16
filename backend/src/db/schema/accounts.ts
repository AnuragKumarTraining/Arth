import { uuid,integer,pgTable, serial, varchar, text, date, timestamp, boolean, } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';
import { customers } from './customers';
import { transactions } from './transaction';
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(), 
  accountId: uuid('account_id').defaultRandom().unique(), 
  accountNumber: varchar('account_number', { length: 20 }).notNull().unique(),
  accountType: varchar('account_type', { length: 20 }).notNull(),
  balance: text('balance').default('0.00').notNull(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  branchId: integer('branch_id')
    .notNull()
    .references(() => branches.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ one,many }) => ({
  customer: one(customers, {
    fields: [accounts.customerId],
    references: [customers.id],
  }),
  branch: one(branches, {
    fields: [accounts.branchId],
    references: [branches.id],
  }),
  sentTransactions: many(transactions, { relationName: 'sentTransactions' }),
  receivedTransactions: many(transactions, { relationName: 'receivedTransactions' }),
}));