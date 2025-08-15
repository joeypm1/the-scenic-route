<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { pageTitle } from '$lib/stores/titleStore';

	pageTitle.set("Profile");

	let { data }: { data: PageServerData } = $props();
	pageTitle.set(data.user.username);
	const initial = (data.user.username?.[0] ?? '?').toUpperCase();

	let copied = $state(false);
	async function copyId() {
		try {
			await navigator.clipboard.writeText(String(data.user.id));
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {

		}
	}

	const enhanceSubmit: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
		};
	}
</script>

<div class="min-h-[70vh] grid place-items-center px-4 py-10">
	<div class="w-full max-w-xl rounded-2xl border bg-white/80 backdrop-blur shadow-lg overflow-hidden">
		<!-- Header -->
		<div class="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>

		<!-- Body -->
		<div class="-mt-12 px-6 pb-6">
			<!-- Avatar -->
			<div class="w-24 h-24 rounded-full ring-4 ring-white bg-blue-600 text-white grid place-items-center text-3xl font-bold shadow-md">
				{initial}
			</div>

			<h1 class="mt-4 text-2xl font-bold text-gray-900">{data.user.username}</h1>
			<p class="text-gray-500">Welcome back!</p>

			<!-- User ID row -->
			<div class="mt-6">
				<label class="block text-sm font-medium text-gray-600 mb-1">User ID</label>
				<div class="flex items-stretch gap-2">
					<input
						class="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 truncate"
						value={String(data.user.id)}
						readonly
					/>
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
						onclick={copyId}
						aria-live="polite"
					>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				</div>
			</div>

			<div class="mt-6 grid grid-cols-3 gap-3 text-center">
				<div class="rounded-lg border p-3">
					<div class="text-xl font-bold">12</div>
					<div class="text-xs text-gray-500">Routes</div>
				</div>
				<div class="rounded-lg border p-3">
					<div class="text-xl font-bold">34</div>
					<div class="text-xs text-gray-500">Ratings</div>
				</div>
				<div class="rounded-lg border p-3">
					<div class="text-xl font-bold">4.7</div>
					<div class="text-xs text-gray-500">Avg Rating</div>
				</div>
			</div>

			<!-- Quick actions -->
			<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
				<a
					href="/explore"
					class="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-800 hover:bg-gray-50 transition"
				>
					Your routes
				</a>
			</div>

			<!-- Sign out -->
			<form method="post" action="?/logout" use:enhance={enhanceSubmit} class="mt-6">
				<button
					class="w-full inline-flex items-center justify-center rounded-lg bg-red-600 text-white px-4 py-2.5 font-medium hover:bg-red-700 transition"
				>
					Sign out
				</button>
			</form>
		</div>
	</div>
</div>