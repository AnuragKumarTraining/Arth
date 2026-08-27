import { 
  pgTable, 
  uuid, 
  varchar, 
  numeric, 
  timestamp, 
  integer, 
  pgEnum 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';

export const loanStatusEnum = pgEnum('loan_status', ['ACTIVE', 'CLOSED', 'DEFAULTED', 'PENDING_DISBURSAL']);
export const loanTypeEnum = pgEnum('loan_type', ['PERSONAL', 'HOME', 'AUTO', 'EDUCATION']);

export const loans = pgTable('loans', {
  id: uuid('id').defaultRandom().primaryKey(),
  loanNumber: varchar('loan_number', { length: 20 }).notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  
  type: loanTypeEnum('type').notNull(),
  status: loanStatusEnum('status').default('ACTIVE').notNull(),
  
  // Financial Specifics
  principalAmount: numeric('principal_amount', { precision: 15, scale: 2 }).notNull(),
  outstandingBalance: numeric('outstanding_balance', { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 }).notNull(), // e.g. 10.50
  tenureMonths: integer('tenure_months').notNull(),
  emiAmount: numeric('emi_amount', { precision: 15, scale: 2 }).notNull(),
  
  nextEmiDate: timestamp('next_emi_date', { mode: 'date' }),
  disbursedAt: timestamp('disbursed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loansRelations = relations(loans, ({ one }) => ({
  customer: one(customers, {
    fields: [loans.customerId],
    references: [customers.id],
  }),
}));