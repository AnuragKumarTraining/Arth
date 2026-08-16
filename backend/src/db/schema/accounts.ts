import { uuid, integer, pgTable, serial, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';
import { customers } from './customers';
import { transactions } from './transaction';

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(), 
  accountId: uuid('account_id').defaultRandom().unique().notNull(), 
  accountNumber: varchar('account_number', { length: 20 }).notNull().unique(),
  accountType: varchar('account_type', { length: 20 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  
  // Financial Precision: Ledger Balance vs Available Balance
  balance: numeric('balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  availableBalance: numeric('available_balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),

  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  branchId: varchar('branch_id', { length: 20 })
    .notNull()
    .references(() => branches.branchCode),
    
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [accounts.customerId],
    references: [customers.id],
  }),
  branch: one(branches, {
    fields: [accounts.branchId],
    references: [branches.branchCode],
  }),
  sentTransactions: many(transactions, { relationName: 'sentTransactions' }),
  receivedTransactions: many(transactions, { relationName: 'receivedTransactions' }),
}));