<script lang="ts">
	import { onMount, mount } from 'svelte';
	import RatingDisplay from '$lib/components/RatingDisplay.svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Feature } from 'geojson';
	import bbox from '@turf/bbox';
	import { pageTitle } from '$lib/stores/titleStore';

	pageTitle.set("Explore");

	let { data } = $props();
	let map: maplibregl.Map;
	let filterLabel: string | null = $state(null);

	function fitToFeatures(features: any[]) {
		if (!features?.length) return;
		const all = features.flatMap((f => f.geometry?.coordinates ?? []));
		if (!all.length) return;
		const bounds = all.reduce(
			(b: maplibregl.LngLatBounds, c: [number, number]) => b.extend(c),
			new maplibregl.LngLatBounds(all[0], all[0])
		);
		map.fitBounds(bounds, { padding: 100 })
	}

	onMount(async () => {
		// fetch user routes
		const userRes = await fetch(`/api/routes${data.by ? `?by=${encodeURIComponent(data.by)}` : ''}`);
		const { features: userFeatures } = await userRes.json();

		// banner label (when filtering by user)
		if (data.by) filterLabel = userFeatures[0]?.properties?.submittedBy ?? data.by;

		// fetch FDOT scenic highways
		let fdotFeatures: any[] = [];
		if (!data.by) {
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
			({ features: fdotFeatures } = await fdotRes.json());
		}

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

			// FDOT Scenic highways (if not filtering by user)
			if (!data.by) {
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
			}

			// popups
			map.on('click', 'user-routes-line', (e) => {
				const f = e.features?.[0] as Feature | undefined;
				if (!f) return;
				const props = e.features![0].properties!;
				const name = props.name ?? 'Unnamed';
				const desc = props.description ?? 'No description';
				const username = props.submittedBy ?? 'unknown';
				const creationDate = props.createdAt ? new Date(props.createdAt).toLocaleDateString() : 'Unknown date';
				const rating = Number(props.avgRating) || 0;

				// zoom to LineString
				const [minX, minY, maxX, maxY] = bbox(f);
				map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 100 });

				// popup
				const container = document.createElement('div');
				container.classList.add('popup-content');
				const h3 = document.createElement('h3');
				h3.textContent = name;
				container.appendChild(h3);
				const p = document.createElement('p');
				p.textContent = desc;
				container.appendChild(p);
				const s = document.createElement('small');
				s.textContent = `Submitted by ${username} on ${creationDate}`;
				container.appendChild(s);

				const starsHolder = document.createElement('div');
				container.appendChild(starsHolder);

				mount(RatingDisplay, {
					target: starsHolder,
					props: { value: rating }
				});

				new maplibregl.Popup({ closeButton: false, closeOnClick: true })
					.setLngLat(e.lngLat)
					// .setHTML(`<h3>${name}</h3><p>${desc}</p><small>Submitted: ${creationDate}</small>`)
					.setDOMContent(container)
					.addTo(map);
			});

			map.on('click', 'fdot-highways-line', (e) => {
				const f = e.features?.[0] as Feature | undefined;
				if (!f) return;
				const props = e.features![0].properties!;
				const title = props.DESCRIPT || props.SCENEHWY;
				const district = props.DISTRICT;

				// zoom to LineString
				const [minX, minY, maxX, maxY] = bbox(f);
				map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 100 });

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

			if (data.by) fitToFeatures(userFeatures);
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


<div class="flex flex-col items-center gap-2">
	{#if data.by}
		<div class="mt-2 flex items-center gap-3">
      <span class="px-2 py-1 rounded bg-blue-50 text-blue-700 text-sm border border-blue-200">
        Filtering by user: <strong>{filterLabel}</strong>
      </span>
			<a href="/explore" class="text-sm text-gray-600 hover:underline">Clear</a>
		</div>
	{/if}

	<div id="map" class="rounded shadow"></div>
</div>