import { pgTable, text, timestamp, integer,date } from 'drizzle-orm/pg-core';

export const pendingRegistrations = pgTable('pending_registrations', {
  email: text('email').primaryKey(),
  password: text('password').notNull(), // Hashed password
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  // Update this line: allow JS Date objects natively
  dateOfBirth: date('date_of_birth', { mode: 'date' }).notNull(),
  phoneNumber: text('phone_number').notNull(),
  nationalId: text('national_id').notNull(),
  address: text('address').notNull(),
  accountType: text('account_type').notNull(),
  hashedOtp: text('hashed_otp').notNull(),
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  resendAvailableAt: timestamp('resend_available_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
