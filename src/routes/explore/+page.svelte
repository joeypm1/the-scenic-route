<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { pageTitle } from '$lib/stores/titleStore';

	pageTitle.set("Explore");

	let map: maplibregl.Map;

	onMount(async () => {
		// fetch user routes
		const userRes = await fetch('/api/routes');
		const { features: userFeatures } = await userRes.json();

		// fetch FDOT scenic highways
		const fdotUrl = new URL(
			"https://services1.arcgis.com/O1JpcwDW8sjYuddV/arcgis/rest/services/Scenic_Highways_TDA/FeatureServer/0/query"
		);
		fdotUrl.searchParams.set("where", "1=1");
		fdotUrl.searchParams.set(
			"outFields",
			["SCENEHWY", "DESCRIPT", "DISTRICT", "COUNTY", "BEGIN_POST", "END_POST", "Shape__Length"].join(',')
		);
		fdotUrl.searchParams.set("outSR", "4326");
		fdotUrl.searchParams.set("f", "pgeojson");
		const fdotRes = await fetch(fdotUrl.toString());
		const { features: fdotFeatures } = await fdotRes.json();

		// init map
		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
			center: [-82.3248, 29.6516],
			zoom: 12
		});

		map.on('load', () => {
			// user routes
			map.addSource('user-routes', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: userFeatures,
				}
			});
			map.addLayer({
				id: 'user-routes-line',
				type: 'line',
				source: 'user-routes',
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-color': '#3b82f6', // blue-500
					'line-width': 6
				}
			});

			// FDOT Scenic highways
			map.addSource('fdot-highways', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: fdotFeatures
				}
			});
			map.addLayer({
				id: 'fdot-highways-line',
				type: 'line',
				source: 'fdot-highways',
				layout: { 'line-cap': 'butt', 'line-join': 'miter' },
				paint: {
					'line-color': '#facc15',
					'line-width': 4
				}
			});

			// popups
			map.on('click', 'user-routes-line', (e) => {
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
				new maplibregl.Popup({ closeButton: false, closeOnClick: true })
					.setLngLat(e.lngLat)
					.setHTML(`<h3>${name}</h3><p>${desc}</p><small>Submitted: ${creationDate}</small>`)
					.addTo(map);
			});

			map.on('click', 'fdot-highways-line', (e) => {
				const props = e.features![0].properties!;
				const title = props.DESCRIPT || props.SCENEHWY;
				const district = props.DISTRICT;

				// zoom to LineString
				const coordinates = e.features?.[0]?.geometry.coordinates;
				const bounds = coordinates.reduce((bounds: maplibregl.LngLatBounds, coord: maplibregl.LngLatLike) => {
					return bounds.extend(coord);
				}, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

				map.fitBounds(bounds, {
					padding: 100
				});

				// popup
				new maplibregl.Popup({ closeButton: false, closeOnClick: true })
					.setLngLat(e.lngLat)
					.setHTML(`<h3>${title}</h3><p>District: ${district}</p><small>County: ${props.COUNTY}</small><small>Length: ${(props.Shape__Length/1609.344).toFixed(1)} mi</small>`)
					.addTo(map);
			});

			map.on('mouseenter', 'user-routes-line', () => map.getCanvas().style.cursor = 'pointer');
			map.on('mouseenter', 'fdot-highways-line', () => map.getCanvas().style.cursor = 'pointer');
			map.on('mouseleave', 'user-routes-line', () => map.getCanvas().style.cursor = '');
			map.on('mouseleave', 'fdot-highways-line', () => map.getCanvas().style.cursor = '');
		});
	});
</script>

<style>
    #map {
        width: 80%;
        height: 80vh;
				margin-top: 2vh;
    }
</style>

<div class="flex justify-center">
	<div id="map" class="rounded shadow"></div>
</div>