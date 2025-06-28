import { db } from '$lib/server/db';
import { scenicSegments } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export async function GET() {
	const rows = await db.select().from(scenicSegments);

	const features = rows.map((row) => {
		try {
			return JSON.parse(row.route_json);
		} catch (e) {
			console.warn('Failed to parse route_json:', e);
			return null;
		}
	}).filter(Boolean);

	return json({ features });
}
