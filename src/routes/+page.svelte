<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Slider } from '$lib/components/ui/slider';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import MapLibreGlDirections, { LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
	import { pageTitle } from '$lib/stores/titleStore';
	import { suggestedRoutes } from '$lib/stores/suggestedRoutes';
	import { debounce } from '$lib/utils/debounce';
	import * as turf from '@turf/turf';
	import polyline from '@mapbox/polyline';

	pageTitle.set("Get Directions");

	let { data } = $props();
	let userRoutes = data.userRoutes;
	let stateRoutes = data.stateRoutes;

	let map: maplibregl.Map;
	let directions: MapLibreGlDirections;

	let start = $state(''), end = $state('');
	let startLoading = $state(false), endLoading = $state(false);
	let startCoord: [number, number], endCoord: [number, number];
	let waypoints: [number, number][];
	let scenicWaypointsAdded = $state(false);
	let loading = $state(false);

	let startSuggestions: string[] = $state([]);
	let endSuggestions: string[] = $state([]);
	let selectedField: 'start' | 'end' | null = $state(null);

	let includeUsers = $state(true), includeState = $state(false);

	let thresholdMiles = $state(1);
	let scenicDetours = $state(3);

	let nonScenicDistance = $state(0);
	let totalDistance = $state(0);

	function findNearbyScenicSegments(routeLine: GeoJSON.LineString, scenicRoutes: GeoJSON.Feature[]) {
		scenicRoutes.forEach((scenic, index) => {
			try {
				if (
					!scenic ||
					scenic.type !== "Feature" ||
					!scenic.geometry ||
					scenic.geometry.type !== "LineString"
				) {
					console.warn(`Invalid geometry at index ${index}`);
					return;
				}

				const scenicFeature = turf.feature(scenic.geometry, scenic.properties);
				const buffered = turf.buffer(scenicFeature, thresholdMiles, { units: 'miles' });
				const intersects = buffered && turf.booleanIntersects(routeLine, buffered);

			} catch (err) {
				console.warn("Error with scenic route", index, err);
			}
		});

		return scenicRoutes.filter((scenic, index) => {
			try {
				if (
					!scenic ||
					scenic.type !== "Feature" ||
					!scenic.geometry ||
					scenic.geometry.type !== "LineString" ||
					!Array.isArray(scenic.geometry.coordinates) ||
					scenic.geometry.coordinates.length < 2
				) {
					console.warn(`Skipping scenic route at index ${index}: Invalid geometry`, scenic);
					return false;
				}

				const scenicFeature = turf.feature(scenic.geometry, scenic.properties);
				const buffered = turf.buffer(scenicFeature, thresholdMiles, { units: 'miles' });
				return buffered && turf.booleanIntersects(routeLine, buffered);
			} catch (e) {
				console.warn(`Skipping scenic route at index ${index}:`, e);
				return false;
			}
		});
	}

	function getMapBounds(): string {
		const bounds = map.getBounds();
		return `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
	}

	const fetchSuggestions = async (query: string, field: 'start' | 'end') => {
		if (!query) return;

		if (field === 'start') {
			startSuggestions = [];
			startLoading = true;
		} else {
			endSuggestions = [];
			endLoading = true;
		}

		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&viewbox=${getMapBounds()}&countrycodes=us`);
			const data = await res.json();
			const results = data.map((entry: any) => entry.display_name);
			if (field === 'start') startSuggestions = results;
			else endSuggestions = results;
		} finally {
			if (field === 'start') startLoading = false;
			else endLoading = false;
		}
	};

	const debouncedFetch = debounce(fetchSuggestions, 300);
	$effect(() => {
		if (selectedField === 'start' && start.length > 2) debouncedFetch(start, 'start');
	});
	$effect(() => {
		if (selectedField === 'end' && end.length > 2) debouncedFetch(end, 'end');
	});

	function selectSuggestion(value: string, field: 'start' | 'end') {
		if (field === 'start') start = value;
		else end = value;
		selectedField = null;
	}

	function addLabeledMarkers(coords: [number, number][]) {
		const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		// remove existing markers
		document.querySelectorAll('.waypoint-label').forEach(el => el.remove());

		coords.forEach(([lng, lat], i) => {
			const el = document.createElement('div');
			el.className = 'waypoint-label';
			el.textContent = labels[i] || '?';

			Object.assign(el.style, {
				backgroundColor: '#fff',
				color: '#000',
				fontSize: '14px',
				fontWeight: 'bold',
				border: '2px solid #000',
				borderRadius: '50%',
				width: '28px',
				height: '28px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				textAlign: 'center',
				boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
			});

			new maplibregl.Marker({ element: el })
				.setLngLat([lng, lat])
				.addTo(map);
		});
	}

	function openInGoogleMaps(waypoints: [number, number][]) {
		if (!waypoints?.length) return;
		const [origin, ...rest] = waypoints;
		const destination = rest.pop();
		const stops = rest.map(([lng, lat]) => `${lat},${lng}`).join('|');
		const originParam = `${origin[1]},${origin[0]}`;
		const destinationParam = `${destination![1]},${destination![0]}`;
		const url = new URL('https://www.google.com/maps/dir/');
		url.searchParams.set('api', '1');
		url.searchParams.set('origin', originParam);
		url.searchParams.set('destination', destinationParam);
		url.searchParams.set('travelmode', 'driving');
		if (stops) url.searchParams.set('waypoints', stops);
		window.open(url.toString(), '_blank');
	}

	async function geocode(location: string): Promise<[number, number]> {
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&viewbox=${getMapBounds()}&countrycodes=us`;//`https://maps.googleapis.com/maps/api/geocode/json?address=${location}`;
		const res = await fetch(url, {
			headers: { 'Accept-Language': 'en' },
		});
		const data = await res.json();
		if (data.length === 0) throw new Error('Location not found: ' + location);
		return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		try {
			// calculate non-scenic directions first
			[startCoord, endCoord] = await Promise.all([geocode(start), geocode(end)]);
			scenicWaypointsAdded = false;
			await directions.setWaypoints([startCoord, endCoord]);
		} catch (err : any) {
			alert(err.message);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		const MapLibreDirections = (await import('@maplibre/maplibre-gl-directions')).default;

		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
			center: [-82.3248, 29.6516],
			zoom: 13
		});

		map.on('load', () => {
			directions = new MapLibreGlDirections(map, {
				requestOptions: {
					alternatives: "false",
				},
			});
			directions.interactive = false;

			map.addControl(new LoadingIndicatorControl(directions), 'top-right');

			directions.on("fetchroutesend", (event) => {
				if (scenicWaypointsAdded) {
					totalDistance = event.data?.routes[0].distance as number / 1609.344;  // convert to miles
					return;
				} else {
					nonScenicDistance = event.data?.routes[0].distance as number / 1609.344;
				}

				if (!event.data?.routes?.length) {
					console.warn("No route returned");
					return;
				}

				// get the route's LineString geometry
				const encoded = event.data.routes[0].geometry as unknown as string;
				const decodedCoords = polyline.decode(encoded);

				const geojsonCoords = decodedCoords.map(([lat, lng]) => [lng, lat]);

				const routeLine: GeoJSON.LineString = {
					type: "LineString",
					coordinates: geojsonCoords
				};

				// fetch scenic routes
				const scenicRoutes = [
					...(includeUsers ? userRoutes : []),
					...(includeState ? stateRoutes : [])
				];
				const scenicSegments = findNearbyScenicSegments(routeLine, scenicRoutes);

				const segmentData = scenicSegments.map(segment => {
					const coords = segment.geometry.coordinates;
					const A: [number, number] = coords[0];
					const B: [number, number] = coords[coords.length-1];
					const ptA = turf.point(A);
					const ptB = turf.point(B);

					// snap both ends to route line
					const nearestA = turf.nearestPointOnLine(routeLine, ptA);
					const nearestB = turf.nearestPointOnLine(routeLine, ptB);

					// how far along the route they lie
					const offsetA = nearestA.properties!.location as number;
					const offsetB = nearestB.properties!.location as number;
					const routeCenter = (offsetA + offsetB) / 2;

					// measure detour in/out distances
					const inDist = turf.distance(ptA, nearestA, { units: 'miles' });
					const outDist = turf.distance(ptB, nearestB, { units: 'miles' });

					// order entry/exit to always go forward
					const points: [number, number][] = offsetA < offsetB ? [A, B] : [B, A];

					// calculate detour score
					const score = inDist + outDist * 1.5;

					return { points, routeCenter, inDist, outDist, score };
				});

				// sort by routeCenter (route order), then by score (smallest detour)
				segmentData.sort((a, b) => {
					if (a.routeCenter !== b.routeCenter) return a.routeCenter - b.routeCenter;
					return a.score - b.score;
				});

				const scenicWaypoints: [number, number][] = segmentData.slice(0, scenicDetours).flatMap(s => s.points);

				waypoints = [
					startCoord,
					...scenicWaypoints,
					endCoord
				];

				suggestedRoutes.set(scenicSegments);

				scenicWaypointsAdded = true;
				directions.setWaypoints(waypoints);

				addLabeledMarkers(waypoints);
			});
		});
	});
</script>

<style>
    #map {
        height: 80vh;
    }
</style>

<div class="p-4 grid grid-cols-[minmax(0,300px)_1fr] gap-8">
	<form id="directionsForm" onsubmit={submitForm} class="flex flex-col gap-4">
		<div class="relative">
			<label for="start" class="block font-medium">Start Location:</label>
			<input
				id="start"
				type="text"
				bind:value={start}
				oninput={() => (selectedField = 'start')}
				placeholder="e.g. 200 E University Ave, Gainesville, FL"
				class="border rounded px-3 py-2 w-full"
				autocomplete="off"
			/>
			{#if selectedField === 'start'}
				{#if startLoading}
					<div class="absolute bg-white border mt-1 rounded shadow w-full z-10 p-2 flex flex-col items-center gap-2">
						<Skeleton class="h-4 w-[250px]" />
						<Skeleton class="h-4 w-[200px]" />
					</div>
				{:else if startSuggestions.length > 0}
					<ul class="absolute bg-white border mt-1 rounded shadow w-full z-10">
						{#each startSuggestions as suggestion}
							<li>
								<button
									type="button"
									class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
									onclick={() => selectSuggestion(suggestion, 'start')}
								>
									{suggestion}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
		<div class="relative">
			<label for="end" class="block font-medium">End Location:</label>
			<input
				id="end"
				type="text"
				bind:value={end}
				oninput={() => (selectedField = 'end')}
				placeholder="e.g. 110 SE Watula Ave, Ocala, FL"
				class="border rounded px-3 py-2 w-full"
				autocomplete="off"
			/>
			{#if selectedField === 'end'}
				{#if endLoading}
					<div class="absolute bg-white border mt-1 rounded shadow w-full z-10 p-2 flex flex-col items-center gap-2">
						<Skeleton class="h-4 w-[250px]" />
						<Skeleton class="h-4 w-[200px]" />
					</div>
				{:else if endSuggestions.length > 0}
					<ul class="absolute bg-white border mt-1 rounded shadow w-full z-10">
						{#each endSuggestions as suggestion}
							<li>
								<button
									type="button"
									class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
									onclick={() => selectSuggestion(suggestion, 'end')}
								>
									{suggestion}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>

		<button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading}>
			{loading ? "Calculating..." : "Get Directions!"}
		</button>

		<label><input type="checkbox" bind:checked={includeUsers} />
			Use user-submitted routes
		</label>

		<label><input type="checkbox" bind:checked={includeState} />
			Use FDOT scenic highways
		</label>

		<label for="detourSlider" class="block text-sm font-medium">Amount of scenic detours: {scenicDetours}</label>
		<Slider id="detourSlider" type="single" bind:value={scenicDetours} max={10} step={1} class="max-w-xl mx-auto" />

		<label for="thresholdSlider" class="block text-sm font-medium">Buffer radius: {thresholdMiles} miles</label>
		<Slider id="thresholdSlider" type="single" bind:value={thresholdMiles} max={10} step={0.5} class="max-w-xl mx-auto" />

		<button type="button" class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50" onclick={() => openInGoogleMaps(waypoints)} disabled={loading || !scenicWaypointsAdded}>
			Open in Google Maps
		</button>

		<button type="button" class="mt-2 bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50" onclick={() => goto('/rate')} disabled={!scenicWaypointsAdded}>
			Rate these suggestions
		</button>

		<p>
			{#if totalDistance}
				Original Route:
				{nonScenicDistance.toFixed(1)} miles
				<br>
				New (Scenic) Route:
				<strong>{totalDistance.toFixed(1)} miles</strong>
			{/if}
		</p>
	</form>

	<div id="map" class="rounded shadow"></div>
</div>