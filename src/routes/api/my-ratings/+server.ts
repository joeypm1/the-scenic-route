import { db } from '$lib/server/db';
import { scenicSegmentRatings } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { inArray } from 'drizzle-orm/expressions';

export const POST = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Not logged in');

	const { ids } = await request.json();
	if (!Array.isArray(ids) || ids.some(i => typeof i !== 'number'))
		throw error(400, 'Invalid payload');

	const rows = await db
		.select({
			segmentId: scenicSegmentRatings.segmentId,
			rating: scenicSegmentRatings.rating
		})
		.from(scenicSegmentRatings)
		.where(and(
			eq(scenicSegmentRatings.userId, user.id),
			inArray(scenicSegmentRatings.segmentId, ids)
		));

	// turn into a lookup table
	const map: Record<number, number> = {};
	for (const r of rows) map[r.segmentId] = r.rating;
	return json(map);
};