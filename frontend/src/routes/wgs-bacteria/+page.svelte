<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated, isPro } from '$lib/stores/auth';
	import { getStorylinesList } from '$lib/storylines/wgs-bacteria';

	onMount(() => {
		if (!$isAuthenticated || !$isPro) goto('/');
	});

	const storylines = getStorylinesList();
	let hoveredStoryline: string | null = $state(null);

	function startStoryline(id: string) {
		goto(`/wgs-bacteria/${id}`);
	}
</script>

<div class="page-scroll h-screen overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
	<!-- Header -->
	<header class="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-6 py-6">
			<div class="flex items-center gap-4">
				<a href="/" class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
				</a>
				<div>
					<h1 class="text-2xl font-bold text-white">WGS Bacteria</h1>
					<p class="text-sm text-slate-400">Whole Genome Sequencing analysis for bacterial pathogens</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-4xl px-6 py-12 pb-24">
		<div class="mb-8">
			<h2 class="mb-2 text-3xl font-bold text-white">Storylines</h2>
			<p class="text-slate-400">
				Each storyline follows a real-world bacterial outbreak scenario. Analyze whole genome sequencing data to identify pathogens, detect resistance genes, and trace transmission.
			</p>
		</div>

		<div class="space-y-4">
			{#each storylines as storyline}
				<button
					onclick={() => startStoryline(storyline.id)}
					onmouseenter={() => hoveredStoryline = storyline.id}
					onmouseleave={() => hoveredStoryline = null}
					class="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<span class="text-2xl">🧬</span>
								<h3 class="text-xl font-semibold text-white">{storyline.title}</h3>
								<span class="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
									{storyline.technologyLabel}
								</span>
							</div>
							<p class="text-slate-400 ml-11">{storyline.subtitle}</p>
						</div>
						<svg class="h-6 w-6 text-slate-500 transition-transform flex-shrink-0 {hoveredStoryline === storyline.id ? 'translate-x-1 text-emerald-400' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</button>
			{/each}
		</div>
	</main>
</div>

<style>
	.page-scroll::-webkit-scrollbar {
		width: 10px;
	}
	.page-scroll::-webkit-scrollbar-track {
		background: rgb(30 41 59);
	}
	.page-scroll::-webkit-scrollbar-thumb {
		background: rgb(100 116 139);
		border-radius: 5px;
	}
	.page-scroll::-webkit-scrollbar-thumb:hover {
		background: rgb(148 163 184);
	}
	.page-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgb(100 116 139) rgb(30 41 59);
	}
</style>
