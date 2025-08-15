import * as auth from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scenicSegments, scenicSegmentRatings } from '$lib/server/db/schema';
import { avg, count, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ( { locals } ) => {
	const user = requireLogin();

	const [{ routesSubmitted }] = await db
		.select({ routesSubmitted: count() })
		.from(scenicSegments)
		.where(eq(scenicSegments.user_id, user.id));

	const [{ ratingsGiven }] = await db
		.select({ ratingsGiven: count() })
		.from(scenicSegmentRatings)
		.where(eq(scenicSegmentRatings.userId, user.id));

	const [{ avgGiven }] = await db
		.select({ avgGiven: avg(scenicSegmentRatings.rating) })
		.from(scenicSegmentRatings)
		.where(eq(scenicSegmentRatings.userId, user.id));

	const [{ avgRating }] = await db
		.select({ avgRating: avg(scenicSegmentRatings.rating) })
		.from(scenicSegmentRatings)
		.innerJoin(scenicSegments, eq(scenicSegmentRatings.segmentId, scenicSegments.id))
		.where(eq(scenicSegments.user_id, user.id));

	const [{ uniqueRaters }] = await db
		.select({ uniqueRaters: sql<number>`count(distinct ${scenicSegmentRatings.userId})` })
		.from(scenicSegmentRatings)
		.innerJoin(scenicSegments, eq(scenicSegmentRatings.segmentId, scenicSegments.id))
		.where(eq(scenicSegments.user_id, user.id));

	return {
		user,
		stats: {
			routesSubmitted: Number(routesSubmitted ?? 0),
			ratingsGiven: Number(ratingsGiven ?? 0),
			avgGiven: avgGiven == null ? null : Number(avgGiven),
			avgRating: avgRating == null ? null : Number(avgRating),
			uniqueRaters: Number(uniqueRaters ?? 0)
		}
	};
};

export const actions: Actions = {
	logout: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}
		await auth.invalidateSession(event.locals.session.id);
		auth.deleteSessionTokenCookie(event);

		return redirect(302, '/login');
	}
};

function requireLogin() {
	const { locals } = getRequestEvent();

	if (!locals.user) {
		return redirect(302, '/login');
	}

	return locals.user;
}
