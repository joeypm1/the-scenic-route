import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const scenicSegments = sqliteTable('scenic_segments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	description: text('description'),
	route_json: text('route_json').notNull(),
	createdAt: text('createdAt').default(new Date().toISOString())
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
