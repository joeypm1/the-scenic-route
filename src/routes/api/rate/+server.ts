import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db }   from '$lib/server/db';
import { scenicSegmentRatings } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request }) => {
	const { segmentId, userId, rating } = await request.json();

	if (
		typeof segmentId !== 'number' ||
		typeof userId    !== 'number' ||
		typeof rating    !== 'number' ||
		rating < 1 || rating > 5
	) {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	await db.insert(scenicSegmentRatings).values({
		segmentId,
		userId,
		rating
	});

	return json({ success: true });
};
