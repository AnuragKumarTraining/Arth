import { 
  pgTable, 
  uuid, 
  varchar, 
  timestamp, 
  boolean, 
  integer 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';

export const beneficiaries = pgTable('beneficiaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  accountNumber: varchar('account_number', { length: 20 }).notNull(),
  ifscCode: varchar('ifsc_code', { length: 11 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  customer: one(customers, {
    fields: [beneficiaries.customerId],
    references: [customers.id],
  }),
}));