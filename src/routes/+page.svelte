<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import MapLibreGlDirections, { LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
	import { pageTitle } from '$lib/stores/titleStore';
	import { debounce } from '$lib/utils/debounce';

	pageTitle.set("Get Directions");

	let map: maplibregl.Map;
	let directions: MapLibreGlDirections;

	let start = '';
	let end = '';
	let loading = false;

	let startSuggestions: string[] = [];
	let endSuggestions: string[] = [];
	let selectedField : 'start' | 'end' | null = null;

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
	$: if (selectedField === 'start' && start.length > 2) debouncedFetch(start, 'start');
	$: if (selectedField === 'end' && end.length > 2) debouncedFetch(end, 'end');

	function selectSuggestion(value: string, field: 'start' | 'end') {
		if (field === 'start') start = value;
		else end = value;
		selectedField = null;
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
			const [startCoord, endCoord] = await Promise.all([geocode(start), geocode(end)]);
			directions.setWaypoints([startCoord, endCoord]);
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
			directions = new MapLibreGlDirections(map);
			directions.interactive = false;

			map.addControl(new LoadingIndicatorControl(directions), 'top-right');

			// directions.setWaypoints([
			// 	[-82.3248, 29.6516],
			// 	[-82.3, 29.68]
			// ]);
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

		<button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading}>
			{loading ? "Calculating..." : "Get Directions!"}
		</button>
	</form>

	<div id="map" class="rounded shadow"></div>
</div>