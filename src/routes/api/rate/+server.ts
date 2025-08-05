import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db }   from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { scenicSegmentRatings } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Must be logged in');

	// parse and validate
	const { ratings } = await request.json();
	if (
		!Array.isArray(ratings) ||
		ratings.some(
			(r) =>
				typeof r.segmentId !== 'number' ||
				typeof r.rating    !== 'number' ||
				r.rating < 1 || r.rating > 5
		)
	) {
		throw error(400, 'Invalid payload');
	}

	await db
		.insert(scenicSegmentRatings)
		.values(ratings.map(({ segmentId, rating }) => ({
			segmentId,
			userId: user.id,
			rating
		})))
		.onConflictDoUpdate({
			target: [scenicSegmentRatings.segmentId, scenicSegmentRatings.userId],
			set: { rating: sql`EXCLUDED.rating` }
		})
		.execute();

	return json({ success: true });
};
