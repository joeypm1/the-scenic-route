import { pgTable, serial, integer, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { mode: 'string' }).notNull()
});

export const scenicSegments = pgTable('scenic_segments', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	route_json: jsonb('route_json').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
