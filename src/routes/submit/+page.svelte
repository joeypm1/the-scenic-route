<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import wasmUrl from 'route-snapper/route_snapper_bg.wasm?url';
	import { init, RouteSnapper } from 'route-snapper/lib.js';
	import { pageTitle } from '$lib/stores/titleStore';

	pageTitle.set("Submit a Route");

	let map: maplibregl.Map;
	let snapper: RouteSnapper;
	let loading = true;
	let isDrawing = false;
	let confirmedFeatures: (GeoJSON.Feature | null)[] | null = null;
	let routeGeoJson: GeoJSON.Feature | null = null;
	let showConfirm = false;
	let routeName = '';
	let routeDescription = '';

	onMount(async () => {
		await init(wasmUrl);  // init WASM

		const graphBytes = await fetch('/api/graph').then(r => r.arrayBuffer());

		const m = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
			center: [-82.3248, 29.6516],  // gainesville
			zoom: 13,
			boxZoom: false,
			doubleClickZoom: false
		});

		m.on('load', () => {
			map = m;

			m.addSource('confirmed-route', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			m.addLayer({
				id: 'confirmed-route-line',
				type: 'line',
				source: 'confirmed-route',
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-color': '#4ade80',  // green-400
					'line-width': 5
				}
			});

			snapper = new RouteSnapper(
				m,
				new Uint8Array(graphBytes),
				document.getElementById('snap-tool')!
			);

			loading = false;

			confirmedFeatures = [];

			document.getElementById('snap-tool')!.addEventListener('new-route', (e) => {
				console.log('new route');
				routeGeoJson = e.detail;
				if (!confirmedFeatures) confirmedFeatures = [];
				confirmedFeatures.push(routeGeoJson);

				// update map layer
				updateRoutesLayer();

				isDrawing = false;
				showConfirm = true;
			});

			document.getElementById('snap-tool')!.addEventListener('no-new-route', () => {
				console.log('No valid route created');
			});
		});
	});

	function updateRoutesLayer() {
		map.getSource('confirmed-route')?.setData({
			type: 'FeatureCollection',
			features: confirmedFeatures
		});
	}

	function toggleDrawing() {
		if (isDrawing) {
			snapper?.stop();
			isDrawing = false;
		} else {
			snapper.start();
			isDrawing = true;
		}

		// clear routes
		confirmedFeatures = [];
		updateRoutesLayer();
	}

	function finishDrawing() {
		const finishButton = document.getElementById('finish-route-button') as HTMLButtonElement | null;

		if (finishButton) {
			finishButton.click();
		} else {
			console.warn('Finish button not found in snap-tool');
		}
	}

	async function submitRoute() {
		if (!routeGeoJson || !routeGeoJson.geometry?.coordinates?.length) {
			console.warn('Invalid or empty route data');
			return;
		}

		routeGeoJson.properties = {
			name: routeName,
			description: routeDescription
		};

		const payload = {
			name: routeName,
			description: routeDescription,
			route_json: JSON.stringify(routeGeoJson),
		}

		console.log('Submitting route ', payload);

		// POST to API
		await fetch('/api/submit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		showConfirm = false;
		routeGeoJson = null;
		routeName = '';
		routeDescription = '';
	}
</script>

<style>
		#map {
				height: 80vh;
		}

		.loading-overlay {
				position: fixed;
				inset: 0;
				background: rgba(255, 255, 255, 0.95);
				display: flex;
				align-items: center;
				justify-content: center;
				z-index: 9999;
		}
</style>

{#if loading}
	<div class="loading-overlay">
		<p class="ml-4 text-lg">Loading map data, this may take a few moments...</p>
	</div>
{/if}

<div class="p-4 grid grid-cols-[minmax(0,300px)_1fr] gap-8">
	<div id="snap-tool" class="hidden"></div>

	<div class="flex flex-col gap-4">
		<!-- toggle/finish drawing buttons -->
		<h1 class="text-lg font-bold">Drawing Tools</h1>
		<button
			class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
			onclick={toggleDrawing}
			disabled={loading}
		>
			{isDrawing ? 'Cancel Drawing' : 'Click to Start Drawing'}
		</button>
		{#if isDrawing}
			<button
				class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
				onclick={finishDrawing}
			>
				Finish Route
			</button>
		{/if}

		<!-- confirm form -->
		{#if showConfirm}
			<div class="p-4 bg-white rounded shadow space-y-4">
				<h2 class="text-lg font-bold">Confirm Scenic Route</h2>

				<label class="block">
					Name:
					<input
						class="w-full mt-1 border border-gray-300 rounded p-2"
						bind:value={routeName}
						placeholder="e.g. SW Wacahoota Road"
					/>
				</label>

				<label class="block">
					Description (optional):
					<textarea
						class="w-full mt-1 border border-gray-300 rounded p-2"
						bind:value={routeDescription}
						placeholder="Describe what makes this route scenic..."
					></textarea>
				</label>

				<div class="flex gap-2">
					<button
						class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
						onclick={submitRoute}
					>
						Save
					</button>
					<button
						class="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
						onclick={() => { showConfirm = false; routeGeoJson = null; confirmedFeatures?.pop(); updateRoutesLayer() }}
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- map -->
	<div id="map" class="rounded shadow"></div>
</div>