import { 
  pgTable, 
  uuid, 
  varchar, 
  numeric,
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
  nickname: varchar('nickname', { length: 50 }),
  accountNumber: varchar('account_number', { length: 20 }).notNull(),
  ifscCode: varchar('ifsc_code', { length: 11 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  dailyLimit: numeric('daily_limit', { precision: 15, scale: 2 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  coolingPeriodEndsAt: timestamp('cooling_period_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  customer: one(customers, {
    fields: [beneficiaries.customerId],
    references: [customers.id],
  }),
}));