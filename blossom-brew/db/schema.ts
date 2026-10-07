import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
export const state = sqliteTable('brew_state', { id: text('id').primaryKey(), data: text('data').notNull(), revision: integer('revision').notNull().default(0) })
export const sessions = sqliteTable('brew_sessions', { token: text('token').primaryKey(), userId: text('user_id').notNull(), expiresAt: integer('expires_at').notNull() })
export const recovery = sqliteTable('brew_recovery', { token: text('token').primaryKey(), userId: text('user_id').notNull(), code: text('code').notNull(), expiresAt: integer('expires_at').notNull(), attempts: integer('attempts').notNull().default(0), verified: integer('verified').notNull().default(0) })
