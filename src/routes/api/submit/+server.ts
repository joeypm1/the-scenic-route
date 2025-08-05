import { db } from '$lib/server/db';
import { scenicSegments } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	const body = await request.json();
	const user = locals.user;
	if (!user) return json({ error: 'Not logged in' }, { status: 401 });

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
		user_id: user.id
	});

	return json({ success: true });
}
