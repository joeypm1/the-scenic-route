<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';

	let map: maplibregl.Map;
	let routes: GeoJSON.Feature[] = [];

	onMount(async () => {
		const res = await fetch('/api/routes');
		const data = await res.json();
		routes = data.features;

		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
			center: [-82.3248, 29.6516],
			zoom: 12
		});

		map.on('load', () => {
			map.addSource('scenic-routes', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: routes
				}
			});

			map.addLayer({
				id: 'scenic-routes-line',
				type: 'line',
				source: 'scenic-routes',
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-color': '#3b82f6', // blue-500
					'line-width': 4
				}
			});

			// Optional: show popup on click
			map.on('click', 'scenic-routes-line', (e) => {
				const props = e.features?.[0]?.properties;
				const name = props?.name ?? 'Unnamed';
				const desc = props?.description ?? 'No description';
				const creationDate = props?.createdAt ?? 'Unknown date';

				new maplibregl.Popup()
					.setLngLat(e.lngLat)
					.setHTML(`<h3>${name}</h3><p>${desc}</p><p>${creationDate}</p>`)
					.addTo(map);
			});

			// Change cursor on hover
			map.on('mouseenter', 'scenic-routes-line', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', 'scenic-routes-line', () => {
				map.getCanvas().style.cursor = '';
			});
		});
	});
</script>

<style>
    #map {
        width: 100%;
        height: 80vh;
    }
</style>

<div id="map" class="rounded shadow"></div>
