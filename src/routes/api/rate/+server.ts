import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db }   from '$lib/server/db';
import { scenicSegmentRatings } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Must be logged in');

	// parse and validate
	const { segmentId, userId, rating } = await request.json();
	if (
		typeof segmentId !== 'number' ||
		typeof userId    !== 'number' ||
		typeof rating    !== 'number' ||
		rating < 1 || rating > 5
	) {
		throw error(400, 'Invalid payload');
	}

	await db.insert(scenicSegmentRatings).values({
		segmentId,
		userId: user.id,
		rating
	}).onConflictDoNothing().execute();

	return json({ success: true });
};
