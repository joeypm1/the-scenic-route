<script lang="ts">
	import { onMount } from 'svelte';
	import { Slider } from '$lib/components/ui/slider';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import MapLibreGlDirections, { LoadingIndicatorControl, layersFactory } from "@maplibre/maplibre-gl-directions";
	import { pageTitle } from '$lib/stores/titleStore';
	import { debounce } from '$lib/utils/debounce';
	import * as turf from '@turf/turf';
	import distance from '@turf/distance';
	import polyline from '@mapbox/polyline';

	pageTitle.set("Get Directions");

	let map: maplibregl.Map;
	let directions: MapLibreGlDirections;

	let start = $state('');
	let end = $state('');
	let startCoord: [number, number];
	let endCoord: [number, number];
	let scenicWaypointsAdded = false;
	let loading = $state(false);

	let startSuggestions: string[] = $state([]);
	let endSuggestions: string[] = $state([]);
	let selectedField: 'start' | 'end' | null = $state(null);

	let thresholdMiles = $state(1);
	let scenicDetours = $state(3);

	function findNearbyScenicSegments(
		routeLine: GeoJSON.LineString,
		scenicRoutes: GeoJSON.Feature[]
	) {
		// const THRESHOLD_MILES = 1;

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
		const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&viewbox=${getMapBounds()}&countrycodes=us`);
		const data = await res.json();
		const results = data.map((entry: any) => entry.display_name);
		if (field === 'start') startSuggestions = results;
		else endSuggestions = results;
	}

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

	async function geocode(location: string): Promise<[number, number]> {
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&viewbox=${getMapBounds()}&countrycodes=us`;//`https://maps.googleapis.com/maps/api/geocode/json?address=${location}`;
		const res = await fetch(url, {
			headers: { 'Accept-Language': 'en' },
		});
		const data = await res.json();
		if (data.length === 0) throw new Error('Location not found: ' + location);
		return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
	}

	async function submitForm() {
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
					alternatives: "true",
				},
			});
			directions.interactive = false;

			map.addControl(new LoadingIndicatorControl(directions), 'top-right');

			directions.on("fetchroutesend", (event) => {
				if (scenicWaypointsAdded) return;

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
				fetch('/api/routes')
					.then(res => res.json())
					.then(data => {
						const scenicRoutes = data.features;
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

						const waypoints: [number, number][] = [
							startCoord,
							...scenicWaypoints,
							endCoord
						];

						scenicWaypointsAdded = true;
						directions.setWaypoints(waypoints);

						addLabeledMarkers(waypoints);
					});
			});
		});
	});
</script>

<style>
		#directionsForm {
				margin-top: 5vh;
		}

    #map {
        height: 80vh;
        width: 80%;
				margin-top: 5vh;
				margin-right: auto;
    }
</style>

<div class="flex justify-center">
	<form id="directionsForm" on:submit|preventDefault={submitForm} class="space-y-2 mb-4 px-4 max-w-xl mx-auto">
		<div class="relative">
			<label for="start" class="block font-medium">Start Location:</label>
			<input
				id="start"
				type="text"
				bind:value={start}
				on:input={() => (selectedField = 'start')}
				placeholder="e.g. 200 E University Ave, Gainesville, FL"
				class="border rounded px-3 py-2 w-full"
				autocomplete="off"
			/>
			{#if selectedField === 'start' && startSuggestions.length > 0}
				<ul class="absolute bg-white border mt-1 rounded shadow w-full z-10">
					{#each startSuggestions as suggestion}
						<li>
							<button
								type="button"
								class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
								on:click={() => selectSuggestion(suggestion, 'start')}
							>
								{suggestion}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="relative">
			<label for="end" class="block font-medium">End Location:</label>
			<input
				id="end"
				type="text"
				bind:value={end}
				on:input={() => (selectedField = 'end')}
				placeholder="e.g. 110 SE Watula Ave, Ocala, FL"
				class="border rounded px-3 py-2 w-full"
				autocomplete="off"
			/>
			{#if selectedField === 'end' && endSuggestions.length > 0}
				<ul class="absolute bg-white border mt-1 rounded shadow w-full z-10">
					{#each endSuggestions as suggestion}
						<li>
							<button
								type="button"
								class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
								on:click={() => selectSuggestion(suggestion, 'end')}
							>
								{suggestion}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<button type="submit" class="bg-blue-500 text-white mb-4 px-4 py-2 rounded disabled:opacity-50" disabled={loading}>
			{loading ? "Calculating..." : "Get Directions!"}
		</button>

		<label class="block text-sm font-medium">Amount of scenic detours: {scenicDetours}</label>
		<Slider type="single" bind:value={scenicDetours} max={10} step={1} class="max-w-xl mx-auto" />

		<label class="block text-sm font-medium">Buffer radius: {thresholdMiles} miles</label>
		<Slider type="single" bind:value={thresholdMiles} max={10} step={0.5} class="max-w-xl mx-auto" />

	</form>


	<div id="map" class="rounded shadow"></div>
</div>