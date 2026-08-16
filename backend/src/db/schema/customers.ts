import { pgTable, serial, varchar, text, date, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';
import { accounts } from './accounts';
import { authSessions } from './refreshTokenTable';
import { beneficiaries } from './beneficiary';

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth', { mode: 'date' }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  nationalId: varchar('national_id', { length: 50 }).notNull().unique(),
  address: text('address').notNull(),
  branchId: varchar('branch_id', { length: 20 })
    .notNull()
    .references(() => branches.branchCode),
  // Banking status fields
  isActive: boolean('is_active').default(false).notNull(),
  kycStatus: varchar('kyc_status', { length: 30 }).default('PENDING_ADMIN_APPROVAL').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customerRelations = relations(customers, ({ one, many }) => ({
  homeBranch: one(branches, {
    fields: [customers.branchId],
    references: [branches.branchCode],
  }),
  accounts: many(accounts),
  authSessions: many(authSessions),
  beneficiaries: many(beneficiaries),
}));



