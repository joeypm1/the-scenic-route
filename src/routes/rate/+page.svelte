<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Feature, LineString } from 'geojson';
	import { suggestedRoutes } from '$lib/stores/suggestedRoutes';
	import { pageTitle } from '$lib/stores/titleStore';
	import * as StarRating from '$lib/components/ui/star-rating';
	import { goto } from '$app/navigation';

	pageTitle.set("Rate Directions");

	type RateFeature = Feature<
		LineString,
		{ id: number; name: string; description?: string; myRating: number; }
	>;

	let rawRoutes: Feature[] = [];
	let routes: RateFeature[] = [];
	const unsub = suggestedRoutes.subscribe(v => (rawRoutes = v));
	onDestroy(unsub);

	let map: maplibregl.Map;
	let inited = false;

	let selectedId: number | null = null;

	async function initMap() {
		await tick();

		// build map
		map = new maplibregl.Map({
			container: 'rate-map',
			style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
			center: [-82.3248, 29.6516],
			zoom: 12
		});
		map.on('load', () => {
			map.addSource('rate-routes', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: routes.map(r => ({ ...r, id: r.properties.id })) }
			});
			map.addLayer({
				id: 'rate-routes-line',
				type: 'line',
				source: 'rate-routes',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': '#facc15',  // yellow
					'line-width': 4
				}
			});
			map.addLayer({  // highlight layer
				id: 'rate-routes-highlight',
				type: 'line',
				source: 'rate-routes',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': '#4ade80',  // green-400
					'line-width': 8
				},
				filter: ['==', ['get', 'id'], -1]
			});
		});
	}

	$: if (routes.length && !inited) {
		inited = true;
		initMap();
	}

	onMount(async () => {
		// fetch current user's ratings
		const ids = rawRoutes.map(r => Number(r.properties!.id));
		const res = await fetch('/api/my-ratings', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({ ids })
		});
		if (!res.ok) {
			console.error('failed to load my ratings');
			return;
		}
		const myRatings: Record<number, number> = await res.json();

		// merge features
		routes = rawRoutes.map(r => ({
			type: "Feature",
			geometry: r.geometry as LineString,
			properties: {
				id: Number(r.properties!.id),
				name: String(r.properties!.name),
				description: r.properties!.description,
				myRating: myRatings[Number(r.properties!.id)] ?? 0
			}
		}));
	});

	function clickRoute(route: RateFeature) {
		selectedId = route.properties.id;

		// pan & zoom to selected route
		const coords = (route.geometry as any).coordinates;
		const bounds = coords.reduce(
			(b: maplibregl.LngLatBounds, c: [number, number]) => b.extend(c as any),
			new maplibregl.LngLatBounds(coords[0], coords[0])
		);
		map.fitBounds(bounds, { padding: 160 });

		// update highlight filter
		map.setFilter('rate-routes-highlight', [
			'==',
			['get', 'id'],
			selectedId
		]);
	}

	async function submitRatings() {
		const payload = routes.map(r => ({
			segmentId: r.properties!.id,
			rating: r.properties.myRating
		}));
		await fetch('/api/rate', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({ ratings: payload })
		});
		goto('/');
	}
</script>

<style>
		#rate-map {
				height: 80vh;
		}

		li.selected {
				border-color: #4ade80;
				background-color: #ecfdf5;
		}
</style>

{#if routes.length === 0}
	<p class="p-4">No suggestions to rate. Please go back and generate some routes first.</p>
{:else}
	<div class="p-4 grid grid-cols-[minmax(0,300px)_1fr] gap-8">
		<div class="flex flex-col space-y-4">
			<h1 class="text-2xl font-bold">Rate these scenic routes</h1>

			<ul class="space-y-6 overflow-y-auto">
				{#each routes as route (route.properties.id)}
					<li
						class="p-4 border rounded bg-white shadow-sm hover:bg-gray-100"
						class:selected={route.properties.id === selectedId}
						onmouseenter={() => clickRoute(route)}
					>
						<h2 class="font-semibold">{route.properties.name}</h2>
						<p class="text-sm text-gray-600 mb-2">{route.properties.description}</p>
						<StarRating.Root bind:value={route.properties.myRating}>
							{#snippet children({ items })}
								{#each items as item (item.index)}
									<StarRating.Star {...item} class="text-yellow-400 cursor-pointer" />
								{/each}
							{/snippet}
						</StarRating.Root>
					</li>
				{/each}
			</ul>

			<button class="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded self-start" onclick={submitRatings}>
				Save Ratings
			</button>
		</div>

		<div>
			<div id="rate-map" class="rounded shadow"></div>
		</div>
	</div>
{/if}
