<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { auth, isAuthenticated, isPro } from '$lib/stores/auth';
	import { authModalOpen } from '$lib/stores/authModal';
	import { API_BASE_URL } from '$lib/stores/terminal';

	interface Mode {
		id: string;
		title: string;
		description: string;
		icon: string;
		comingSoon?: boolean;
		paid?: boolean;
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
			paid: true,
		},
		{
			id: 'amplicon-bacteria',
			title: 'Amplicon Bacteria',
			description: '16S rRNA gene sequencing for microbiome analysis',
			icon: '🦠',
			paid: true,
		},
		{
			id: 'rna-seq',
			title: 'RNA-Seq',
			description: 'Transcriptomics analysis for differential gene expression',
			icon: '📊',
			comingSoon: true
		}
	];

	let showPricingModal = $state(false);
	let selectedPlan = $state<string | null>(null);
	let checkoutLoading = $state(false);
	let groupEmails = $state('');

	const plans = [
		{ id: 'day', name: 'Day Pass', price: 'RM 20', duration: '24 hours', accounts: '1 user' },
		{ id: 'monthly', name: 'Monthly', price: 'RM 80', duration: '30 days', accounts: '1 user' },
		{ id: 'group_monthly', name: 'Group Monthly', price: 'RM 640', duration: '30 days', accounts: 'Up to 10 users' },
	];

	onMount(() => {
		// Refresh subscription status after returning from Stripe
		const params = new URLSearchParams(window.location.search);
		if (params.get('payment') === 'success') {
			auth.fetchMe();
			// Clean up URL
			window.history.replaceState({}, '', '/');
		}
	});

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
		if (mode.paid && !$isPro) {
			showPricingModal = true;
			return;
		}
		goto(`/${mode.id}`);
	}

	async function startCheckout() {
		if (!selectedPlan) return;
		checkoutLoading = true;
		try {
			const authHeader = auth.getAuthHeader();
			if (!authHeader) {
				$authModalOpen = true;
				return;
			}
			const body: Record<string, unknown> = { plan: selectedPlan };
			if (selectedPlan === 'group_monthly' && groupEmails.trim()) {
				body.group_emails = groupEmails.split(/[,\n]+/).map(e => e.trim()).filter(Boolean);
			}
			const res = await fetch(`${API_BASE_URL}/payments/create-checkout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: authHeader,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json();
				alert(err.detail || 'Failed to start checkout');
				return;
			}
			const data = await res.json();
			window.location.href = data.checkout_url;
		} finally {
			checkoutLoading = false;
		}
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
							{:else if mode.paid && $isPro}
								<span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
									Pro
								</span>
							{:else if mode.paid && !$isAuthenticated}
								<span class="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
									Login Required
								</span>
							{:else if mode.paid}
								<span class="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
									Pro
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

<!-- Pricing Modal -->
{#if showPricingModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog">
		<div class="mx-4 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-white">Upgrade to Pro</h2>
				<button onclick={() => showPricingModal = false} class="text-slate-400 hover:text-white">
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<p class="mb-6 text-slate-400">Get access to WGS Bacteria, Amplicon Bacteria, and all future modules.</p>
			<div class="grid gap-4 md:grid-cols-3">
				{#each plans as plan}
					<button
						onclick={() => selectedPlan = plan.id}
						class="rounded-xl border p-4 text-left transition-all {selectedPlan === plan.id
							? 'border-emerald-500 bg-emerald-500/10'
							: 'border-slate-600 bg-slate-700/50 hover:border-slate-500'}"
					>
						<h3 class="text-lg font-semibold text-white">{plan.name}</h3>
						<p class="text-2xl font-bold text-emerald-400">{plan.price}</p>
						<p class="text-xs text-slate-400">{plan.duration}</p>
						<p class="mt-2 text-xs text-slate-500">{plan.accounts}</p>
					</button>
				{/each}
			</div>
			{#if selectedPlan === 'group_monthly'}
				<div class="mt-4">
					<label for="group-emails" class="mb-1 block text-sm text-slate-300">Group member emails (up to 10, comma or newline separated)</label>
					<textarea
						id="group-emails"
						bind:value={groupEmails}
						rows="3"
						class="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
						placeholder="user1@example.com, user2@example.com"
					></textarea>
				</div>
			{/if}
			<button
				onclick={startCheckout}
				disabled={!selectedPlan || checkoutLoading}
				class="mt-6 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{checkoutLoading ? 'Redirecting to checkout...' : 'Continue to Payment'}
			</button>
		</div>
	</div>
{/if}

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
