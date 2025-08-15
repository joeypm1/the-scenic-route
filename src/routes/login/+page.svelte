<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { pageTitle } from '$lib/stores/titleStore';

	pageTitle.set("Log in or register");

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);

	const enhanceSubmit: SubmitFunction = () => {
		submitting = true;

		return async ({ result, update }) => {
			submitting = false;

			// redirects
			if (result.type == 'redirect') {
				goto(result.location);
				return;
			}

			await update();
		};
	};
</script>

<div class="min-h-[75vh] grid place-items-center px-4">
	<div class="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
		<h1 class="text-2xl font-bold text-gray-900 mb-1 text-center">Welcome back</h1>
		<p class="text-sm text-gray-600 mb-6 text-center">
			Log in or create an account to rate routes and submit your own.
		</p>

		{#if form?.message}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
				{form.message}
			</div>
		{/if}

		<form method="post" action="?/login" use:enhance={enhanceSubmit} class="space-y-4" aria-busy={submitting}>
			<div>
				<label for="username" class="block text-sm font-medium text-gray-700">Username</label>
				<input
					id="username"
					name="username"
					autocomplete="username"
					placeholder="yourname"
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
				<input
					id="password"
					type="password"
					name="password"
					autocomplete="current-password"
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
				/>
			</div>

			<div class="flex items-center justify-between gap-3 pt-2">
				<button
					type="submit"
					class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={submitting}
				>
					{submitting ? 'Working...' : 'Log in'}
				</button>

				<button
					formaction="?/register"
					class="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={submitting}
				>
					Create account
				</button>
			</div>
		</form>
	</div>
</div>