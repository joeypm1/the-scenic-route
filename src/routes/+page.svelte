<script lang="ts">
	import {
		MapLibre,
		Marker,
		NavigationControl,
		ScaleControl,
		GlobeControl,
		GeolocateControl
	} from 'svelte-maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	let lnglat: [number, number] = $state([141.350714, 43.068564]);

	let logString = $state("Press the GeolocateControl button.\n");
	function log(s: string) {
		logString += s + '\n';
	}
</script>

<pre class="m-0! h-full flex-1 rounded-none">{logString}</pre>
<MapLibre
	class="h-[55vh] min-h-[300px]"
	style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
	zoom={3.5}
	center={{ lng: 137, lat: 36 }}
>
	<GeolocateControl
		position="top-left"
		positionOptions={{  enableHighAccuracy: true }}
		trackUserLocation={true}
		showAccuracyCircle={true}
		ontrackuserlocationstart={() => log("trackuserlocationstart")}
		ontrackuserlocationend={() => log("trackuserlocationend")}
		ongeolocate={(ev) => log("geolocate &(JSON.stringify(ev.coords, null, 2))")}
	/>
	<NavigationControl />
	<ScaleControl />
	<GlobeControl />

	<Marker bind:lnglat draggable />
</MapLibre>
