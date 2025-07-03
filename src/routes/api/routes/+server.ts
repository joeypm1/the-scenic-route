import { db } from '$lib/server/db';
import { scenicSegments } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export async function GET() {
	const rows = await db.select().from(scenicSegments);

	const features = rows.map((row) => {
		try {
			const geo = JSON.parse(row.route_json);
			return {
				...geo,
				properties: {
					...(geo.properties ?? {}),
					name: row.name,
					description: row.description ?? '',
					createdAt: row.createdAt
				}
			};
		} catch (e) {
			console.warn('Failed to parse route_json:', e);
			return null;
		}
	}).filter(Boolean);

	return json({ features });
}
