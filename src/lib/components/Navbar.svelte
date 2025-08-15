<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '$lib/stores/titleStore';
	let isOpen = $state(false);

	const user = $derived(page.data.user ?? null);
</script>

<nav class="bg-white border-b border-gray-200 shadow-md px-4 py-3 flex justify-between items-center">
	<!-- The Scenic Route -->
	<a href="/" class="text-xl font-bold text-blue-600 hover:text-blue-700 px-12">The Scenic Route</a>

	<!-- Page title	-->
	<h1 class="text-xl font-semibold text-gray-800">{$pageTitle}</h1>

	<!-- Desktop nav links -->
	<div class="hidden md:flex gap-6 items-center px-12">
		<a href="/" class="font-semibold text-green-600 hover:text-blue-600">Get Directions</a>
		<a href="/explore" class="text-gray-700 hover:text-blue-600">Explore</a>
		<a href="/submit" class="text-gray-700 hover:text-blue-600">Submit</a>
		<a href="/about" class="text-gray-700 hover:text-blue-600">About</a>
		{#if user}
			<a href="/profile" class="text-gray-700 hover:text-blue-600">View profile</a>
		{:else}
			<a href="/login" class="text-gray-700 hover:text-blue-600">Log in or sign up</a>
		{/if}
	</div>

	<!-- Mobile Hamburger -->
	<button
		class="md:hidden focus:outline-none"
		onclick={() => (isOpen = !isOpen)}
		aria-label="Toggle menu"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	</button>
</nav>

<!-- Mobile Dropdown -->
{#if isOpen}
	<div class="md:hidden bg-white border-t border-gray-200 shadow px-4 pt-2 pb-4 space-y-2">
		<a href="/explore" class="block text-gray-700 hover:text-blue-600">Explore</a>
		<a href="/submit" class="block text-gray-700 hover:text-blue-600">Submit</a>
		<a href="/about" class="block text-gray-700 hover:text-blue-600">About</a>
		{#if user}
			<a href="/profile" class="block text-gray-700 hover:text-blue-600">View profile</a>
		{:else}
			<a href="/login" class="block text-gray-700 hover:text-blue-600">Log in or sign up</a>
		{/if}
	</div>
{/if}
