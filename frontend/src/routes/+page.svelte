<script lang="ts">
	import { goto } from '$app/navigation';
	import { isAuthenticated } from '$lib/stores/auth';
	import { authModalOpen } from '$lib/stores/authModal';

	interface Mode {
		id: string;
		title: string;
		description: string;
		icon: string;
		comingSoon?: boolean;
	}

	const modes: Mode[] = [
		{
			id: 'tutorial',
			title: 'Tutorials',
			description: 'Start here! Learn bioinformatics fundamentals step-by-step',
			icon: '📚',
		},
		{
			id: 'wgs-bacteria',
			title: 'WGS Bacteria',
			description: 'Whole Genome Sequencing analysis for bacterial pathogens',
			icon: '🧬',
		},
		{
			id: 'amplicon-bacteria',
			title: 'Amplicon Bacteria',
			description: '16S rRNA gene sequencing for microbiome analysis',
			icon: '🦠',
		},
		{
			id: 'rna-seq',
			title: 'RNA-Seq',
			description: 'Transcriptomics analysis for differential gene expression',
			icon: '📊',
			comingSoon: true
		}
	];

	function selectMode(mode: Mode) {
		if (mode.comingSoon) return;
		if (mode.id === 'tutorial') {
			goto(`/${mode.id}`);
			return;
		}
		if (!$isAuthenticated) {
			$authModalOpen = true;
			return;
		}
		goto(`/${mode.id}`);
	}

</script>

<div class="homepage-scroll h-screen overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
	<!-- Header -->
	<header class="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-6 py-6">
			<div class="flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-lg shadow-emerald-500/20">
					🧬
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">BioLearn</h1>
					<p class="text-sm text-slate-400">Interactive Bioinformatics Learning Platform</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-6 py-12">
		<!-- Hero Section -->
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-4xl font-bold text-white">
				Learn Bioinformatics by <span class="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Doing</span>
			</h2>
			<p class="mx-auto max-w-2xl text-lg text-slate-400">
				Master bioinformatics tools through interactive, narrative-driven scenarios.
				Choose a mode below to begin your journey.
			</p>
		</div>

		<!-- Mode Selection -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each modes as mode}
				<button
					onclick={() => selectMode(mode)}
					class="w-full rounded-2xl border text-left transition-all duration-300 {mode.comingSoon
						? 'cursor-not-allowed border-slate-700 bg-slate-800/30 opacity-60'
						: 'border-slate-700 bg-slate-800/50 hover:border-emerald-500/50 hover:bg-slate-800'}"
					disabled={mode.comingSoon}
				>
					<div class="p-6">
						<div class="mb-4 flex items-center justify-between">
							<span class="text-4xl">{mode.icon}</span>
							{#if mode.comingSoon}
								<span class="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-400">
									Coming Soon
								</span>
							{:else if mode.id === 'tutorial'}
								<span class="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
									Free
								</span>
							{:else if !$isAuthenticated}
								<span class="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
									Login Required
								</span>
							{/if}
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">{mode.title}</h3>
						<p class="text-sm text-slate-400">{mode.description}</p>
					</div>
				</button>
			{/each}
		</div>

		<!-- Features Section -->
		<div class="mt-16 grid gap-8 md:grid-cols-3">
			<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
				<div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white">Interactive Terminal</h3>
				<p class="text-sm text-slate-400">
					Practice real bioinformatics commands in a safe, simulated environment
				</p>
			</div>

			<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
				<div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white">Narrative Learning</h3>
				<p class="text-sm text-slate-400">
					Follow engaging storylines that teach concepts in context
				</p>
			</div>

			<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
				<div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white">Visual Results</h3>
				<p class="text-sm text-slate-400">
					See your analysis results with interactive charts and graphs
				</p>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-slate-700/50 bg-slate-900/50">
		<div class="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
			BioLearn - Learn bioinformatics through hands-on experience
		</div>
	</footer>
</div>

<style>
	/* Homepage scrollbar */
	.homepage-scroll::-webkit-scrollbar {
		width: 10px;
	}
	.homepage-scroll::-webkit-scrollbar-track {
		background: rgb(30 41 59);
	}
	.homepage-scroll::-webkit-scrollbar-thumb {
		background: rgb(100 116 139);
		border-radius: 5px;
	}
	.homepage-scroll::-webkit-scrollbar-thumb:hover {
		background: rgb(148 163 184);
	}
	/* Firefox */
	.homepage-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgb(100 116 139) rgb(30 41 59);
	}
</style>
