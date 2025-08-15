import { db } from '$lib/server/db';
import { scenicSegments, scenicSegmentRatings, user } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { eq, avg, count } from 'drizzle-orm';

export async function GET({ url }) {
	const by = url.searchParams.get('by');

	let base = db
		.select({
			id: scenicSegments.id,
			name: scenicSegments.name,
			description: scenicSegments.description,
			routeJson: scenicSegments.route_json,
			createdAt: scenicSegments.createdAt,
			submittedBy: user.username,
			avgRating: avg(scenicSegmentRatings.rating).as('avgRating'),
			ratingCount: count(scenicSegmentRatings.rating).as('count'),
		})
		.from(scenicSegments)
		.leftJoin(scenicSegmentRatings, eq(scenicSegmentRatings.segmentId, scenicSegments.id))
		.leftJoin(user, eq(user.id, scenicSegments.user_id))

	const addWhere = by ? base.where(eq(scenicSegments.user_id, by)) : base;

	const rows = await addWhere.groupBy(scenicSegments.id, user.username);

	const features = rows.map((row) => ({
		type: 'Feature' as const,
		geometry: (row.routeJson as GeoJSON.Feature).geometry,
		properties: {
			id: row.id,
			name: row.name,
			description: row.description ?? '',
			createdAt: row.createdAt,
			submittedBy: row.submittedBy ?? 'unknown',
			avgRating: row.avgRating ?? 0,
			ratingCount: row.ratingCount ?? 0,
		}
	}));

	return json({ features });
}
