import { db } from '$lib/server/db';
import { scenicSegments, scenicSegmentRatings } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { eq, avg, count } from 'drizzle-orm';

export async function GET() {
	const rows = await db
		.select({
			id: scenicSegments.id,
			routeJson: scenicSegments.route_json,
			name: scenicSegments.name,
			description: scenicSegments.description,
			createdAt: scenicSegments.createdAt,
			avgRating: avg(scenicSegmentRatings.rating).as('avgRating'),
			ratingCount: count(scenicSegmentRatings.rating).as('count')
		})
		.from(scenicSegments)
		.leftJoin(
			scenicSegmentRatings,
			eq(scenicSegmentRatings.segmentId, scenicSegments.id)
		)
		.groupBy(scenicSegments.id);

	const features = rows.map((row) => ({
		type: 'Feature' as const,
		geometry: (row.routeJson as GeoJSON.Feature).geometry,
		properties: {
			name: row.name,
			description: row.description ?? '',
			createdAt: row.createdAt,
			avgRating: row.avgRating ?? 0,
			ratingCount: row.ratingCount ?? 0,
		}
	}));

	return json({ features });
}
