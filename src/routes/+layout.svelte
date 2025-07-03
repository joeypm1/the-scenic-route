<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { pageTitle } from '$lib/stores/titleStore';

	const { children } = $props();
</script>

<svelte:head>
	<title>{$pageTitle} | The Scenic Route</title>
</svelte:head>

<Navbar />

<main>
	{@render children()}
</main>