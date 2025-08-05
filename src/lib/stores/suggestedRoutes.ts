import type { Feature } from 'geojson';
import { writable } from 'svelte/store';

export const suggestedRoutes = writable<Feature[]>([]);