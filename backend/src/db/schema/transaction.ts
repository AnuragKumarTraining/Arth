import { 
  pgTable, 
  uuid, 
  varchar, 
  timestamp, 
  numeric, 
  boolean, 
  text, 
  pgEnum ,
  serial,
  integer
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { relations } from 'drizzle-orm';

export const transactionTypeEnum = pgEnum('transaction_type', ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']);
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']);

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceNumber: varchar('reference_number', { length: 50 }).notNull().unique(), 
  
  senderAccountId: integer('sender_account_id').references(() => accounts.id), 
  receiverAccountId: integer('receiver_account_id').references(() => accounts.id), 

  externalAccountNumber: varchar('external_account_number', { length: 50 }),
  externalRoutingCode: varchar('external_routing_code', { length: 20 }), // e.g., IFSC, SWIFT, Routing Number
  externalBankName: varchar('external_bank_name', { length: 100 }),

  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  status: transactionStatusEnum('status').default('PENDING').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  senderAccount: one(accounts, {
    fields: [transactions.senderAccountId],
    references: [accounts.id],
    relationName: 'sentTransactions',
  }),
  receiverAccount: one(accounts, {
    fields: [transactions.receiverAccountId],
    references: [accounts.id],
    relationName: 'receivedTransactions',
  }),
}));
