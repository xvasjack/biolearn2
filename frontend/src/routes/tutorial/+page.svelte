<script lang="ts">
	import { goto } from '$app/navigation';
	import { getStorylinesList } from '$lib/storylines/tutorial';

	// Filter out linux-basics since it's displayed as a featured "Start Here" item above
	const tutorials = getStorylinesList().filter(t => t.id !== 'linux-basics');

	let hoveredTutorial: string | null = $state(null);

	function startTutorial(id: string) {
		goto(`/tutorial/${id}`);
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
					<h1 class="text-2xl font-bold text-white">Tutorials</h1>
					<p class="text-sm text-slate-400">Learn bioinformatics fundamentals step-by-step</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-4xl px-6 py-12 pb-24">
		<div class="mb-8">
			<h2 class="mb-2 text-3xl font-bold text-white">Getting Started</h2>
			<p class="text-slate-400">
				These tutorials introduce you to bioinformatics analysis. Start here if you're new to sequencing data analysis.
			</p>
		</div>

		<div class="space-y-4">
			<!-- Linux Basics - First tutorial for beginners -->
			<button
				onclick={() => startTutorial('linux-basics')}
				onmouseenter={() => hoveredTutorial = 'linux-basics'}
				onmouseleave={() => hoveredTutorial = null}
				class="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800"
			>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-3 mb-2">
							<span class="text-2xl">💻</span>
							<h3 class="text-xl font-semibold text-white">Linux Command Line Basics</h3>
							<span class="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
								Start Here
							</span>
						</div>
						<p class="text-slate-400 ml-11">Essential command line skills for bioinformatics</p>
					</div>
					<svg class="h-6 w-6 text-slate-500 transition-transform flex-shrink-0 {hoveredTutorial === 'linux-basics' ? 'translate-x-1 text-emerald-400' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</button>

			{#each tutorials as tutorial}
				<button
					onclick={() => startTutorial(tutorial.id)}
					onmouseenter={() => hoveredTutorial = tutorial.id}
					onmouseleave={() => hoveredTutorial = null}
					class="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<span class="text-2xl">🧬</span>
								<h3 class="text-xl font-semibold text-white">{tutorial.title}</h3>
								<span class="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
									{tutorial.technologyLabel}
								</span>
							</div>
							<p class="text-slate-400 ml-11">{tutorial.subtitle}</p>
						</div>
						<svg class="h-6 w-6 text-slate-500 transition-transform flex-shrink-0 {hoveredTutorial === tutorial.id ? 'translate-x-1 text-emerald-400' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</button>
			{/each}
		</div>

		<!-- What You'll Learn -->
		<div class="mt-12 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
			<h3 class="mb-4 text-lg font-semibold text-white">What You'll Learn</h3>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium text-white">Quality Control</p>
						<p class="text-sm text-slate-400">Assess sequencing data quality with FastQC</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium text-white">Read Trimming</p>
						<p class="text-sm text-slate-400">Clean reads with Trimmomatic</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium text-white">Genome Assembly</p>
						<p class="text-sm text-slate-400">Build genomes with Unicycler</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium text-white">AMR Detection</p>
						<p class="text-sm text-slate-400">Find resistance genes with ABRicate</p>
					</div>
				</div>
			</div>
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
