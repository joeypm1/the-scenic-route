import { db } from '$lib/server/db';
import { scenicSegments } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const body = await request.json();
	// console.log('Received body:', body);
	const routeGeo = JSON.parse(body.route_json) as GeoJSON.Feature;

	if (
		!body.name || typeof body.name !== 'string' ||
		!body.route_json || typeof body.route_json !== 'string'
	) {
		return json({ error: 'Missing or invalid fields' }, { status: 400 });
	}

	await db.insert(scenicSegments).values({
		name: body.name,
		description: body.description ?? null,
		route_json: routeGeo,
	});

	return json({ success: true });
}
