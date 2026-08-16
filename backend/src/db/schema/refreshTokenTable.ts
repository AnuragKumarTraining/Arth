import { uuid,integer,pgTable, serial, varchar, text, date, timestamp, boolean, } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';
import { customers } from './customers';

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull().unique(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const relationWithCustomer = relations(authSessions,({one})=>({
    customer: one(customers,{
        fields: [authSessions.customerId],
        references: [customers.id],

    })
}))
