import type { PageLoad } from './$types';
import { suggestedRoutes } from '$lib/stores/suggestedRoutes';

export const load: PageLoad = async () => {
	return {
		routes: suggestedRoutes
	};
};