import { pgTable, serial, integer, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
});

export const scenicSegments = pgTable('scenic_segments', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	route_json: jsonb('route_json').notNull(),
	user_id: text('user_id').notNull().references(() => user.id),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const scenicSegmentRatings = pgTable('scenic_segment_ratings', {
	id: serial('id').primaryKey(),
	segmentId: integer('segment_id').notNull().references(() => scenicSegments.id),
	userId: text('user_id').notNull().references(() => user.id),
	rating: integer('rating').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
