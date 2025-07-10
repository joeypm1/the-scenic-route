<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { pageTitle } from '$lib/stores/titleStore';

	pageTitle.set("Explore");

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
					'line-width': 6
				}
			});

			map.on('click', 'scenic-routes-line', (e) => {
				const props = e.features?.[0]?.properties;
				const name = props?.name ?? 'Unnamed';
				const desc = props?.description ?? 'No description';
				const creationDate = props?.createdAt ? new Date(props.createdAt).toLocaleDateString() : 'Unknown date';

				// zoom to LineString
				const coordinates = e.features?.[0]?.geometry.coordinates;
				const bounds = coordinates.reduce((bounds: maplibregl.LngLatBounds, coord: maplibregl.LngLatLike) => {
					return bounds.extend(coord);
				}, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

				map.fitBounds(bounds, {
					padding: 100
				});

				// popup
				new maplibregl.Popup({ className: "apple", closeButton: false, closeOnClick: true })
					.setLngLat(e.lngLat)
					.setHTML(`<h3>${name}</h3><p>${desc}</p><small>Submitted: ${creationDate}</small>`)
					.addTo(map);
			});

			map.on('mouseenter', 'scenic-routes-line', () => map.getCanvas().style.cursor = 'pointer');
			map.on('mouseleave', 'scenic-routes-line', () => map.getCanvas().style.cursor = '');
		});
	});
</script>

<style>
    #map {
        width: 80%;
        height: 80vh;
				margin-top: 5vh;
    }
		.maplibregl-popup-content {
				font-family: 'Inter', sans-serif;
				max-width: 300px;
				padding: 12px;
				background-color: white;
				box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
				border-radius: 8px;
		}
</style>

<div class="flex justify-center">
	<div id="map" class="rounded shadow"></div>
</div>