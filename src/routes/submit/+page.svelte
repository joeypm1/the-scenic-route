<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import wasmUrl from 'route-snapper/route_snapper_bg.wasm?url';
	import { init, RouteSnapper } from 'route-snapper/lib.js';

	let map: maplibregl.Map;
	let snapper: RouteSnapper;
	let isDrawing = false;
	let confirmedFeatures: (GeoJSON.Feature | null)[] | null = null;
	let routeGeoJson: GeoJSON.Feature | null = null;
	let showConfirm = false;
	let routeName = '';
	let routeDescription = '';

	onMount(async () => {
		await init(wasmUrl);

		const graphBytes = await fetch('/graph/streets_only_graph_gnv.bin').then(r => r.arrayBuffer());

		const m = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
			center: [-82.3248, 29.6516], // Gainesville
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

			confirmedFeatures = [];

			document.getElementById('snap-tool')!.addEventListener('new-route', (e) => {
				console.log('new route');
				routeGeoJson = e.detail;
				if (!confirmedFeatures) confirmedFeatures = [];
				confirmedFeatures.push(routeGeoJson);

				// update map layer
				map.getSource('confirmed-route')?.setData({
					type: 'FeatureCollection',
					features: confirmedFeatures
				});

				isDrawing = false;
				showConfirm = true;
			});

			document.getElementById('snap-tool')!.addEventListener('no-new-route', () => {
				console.log('No valid route created');
			});
		});
	});

	function toggleDrawing() {
		if (isDrawing) {
			snapper.stop();
			isDrawing = false;
		} else {
			snapper.start();
			isDrawing = true;
		}
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
				width: 100%;
				height: 60vh;
		}
</style>

<!-- map -->
<div id="map" class="rounded shadow"></div>
<div id="snap-tool" class="hidden"></div>

<!-- toggle drawing button -->
<h1>Drawing Tools</h1>
<button
	class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
	on:click={toggleDrawing}
>
	{isDrawing ? 'Cancel Drawing' : 'Click to Start Drawing'}
</button>
{#if isDrawing}
	<button
		class="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
		on:click={finishDrawing}
	>
		Finish Route
	</button>
{/if}

<!-- confirm form -->
{#if showConfirm}
	<div class="mt-4 p-4 bg-white rounded shadow space-y-4">
		<h2 class="text-lg font-bold">Confirm Scenic Route</h2>

		<label class="block">
			Name:
			<input
				class="w-full mt-1 border border-gray-300 rounded p-2"
				bind:value={routeName}
				placeholder="Eg. Tree Tunnel on SW 13th St"
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

		<div class="flex gap-4">
			<button
				class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
				on:click={submitRoute}
			>
				Save
			</button>
			<button
				class="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
				on:click={() => { showConfirm = false; routeGeoJson = null; }}
			>
				Cancel
			</button>
		</div>
	</div>
{/if}