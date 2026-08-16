import { uuid, integer, pgTable, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  customer: one(customers, {
    fields: [authSessions.customerId],
    references: [customers.id],
  }),
}));
